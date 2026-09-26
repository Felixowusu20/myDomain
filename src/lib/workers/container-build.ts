import { mkdir, mkdtemp, readFile, rm, cp, access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { githubArchive } from "@/lib/github/api";
import { frameworkRuntime } from "@/lib/runtime/presets";
import { buildPreviewUrl } from "@/lib/runtime/preview-url";
import {
  allocateRuntimePort,
  startRuntimeContainer,
  stopRuntimeContainer,
  waitForRuntimeHealthy,
} from "@/lib/workers/container-runtime";

const exec = promisify(execFile);
const BUILD_IMAGE = process.env.BUILD_IMAGE?.trim() || "node:22-alpine";
const ARTIFACT_ROOT = join(process.cwd(), "var", "deployments");
const RUNTIME_ROOT = join(process.cwd(), "var", "runtimes");
const NPM_CACHE_VOLUME = "mydomain-npm-cache";

const outputDirectories: Record<string, string> = {
  "Next.js": ".next",
  Nuxt: ".output",
  Remix: "build",
  Astro: "dist",
  SvelteKit: "build",
  Vite: "dist",
  "Create React App": "build",
  Gatsby: "public",
  Vue: "dist",
  Other: ".",
};

function deploymentEnv(envVarsJson: string) {
  try {
    const parsed = JSON.parse(envVarsJson || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const key = String((item as { key?: string }).key ?? "").trim();
        const value = String((item as { value?: string }).value ?? "");
        return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? [`${key}=${value}`] : [];
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

function redactBuildOutput(output: string, envVarsJson: string) {
  let redacted = output
    .replace(/Command failed: docker[\s\S]*$/gm, "Command failed: docker build")
    .replace(/docker run[\s\S]*?(?=\nnpm |\nerror |$)/gi, "[docker build command redacted]\n");

  for (const entry of deploymentEnv(envVarsJson)) {
    const separator = entry.indexOf("=");
    const key = separator >= 0 ? entry.slice(0, separator) : entry;
    const value = separator >= 0 ? entry.slice(separator + 1) : "";
    if (value.length >= 4) redacted = redacted.replaceAll(value, "[REDACTED]");
    redacted = redacted.replaceAll(new RegExp(`${key}=([^\\s]+)`, "g"), `${key}=[REDACTED]`);
  }
  return redacted.slice(-12_000);
}

function friendlyBuildError(raw: string) {
  if (/is not a valid npm option/i.test(raw)) {
    return "Build config had an invalid npm option. Redeploy to use the fixed installer.";
  }
  if (/EIDLETIMEOUT|registry\.npmjs\.org|ETIMEDOUT|ENOTFOUND|network/i.test(raw)) {
    return "npm could not reach registry.npmjs.org (network idle timeout). Check your internet connection / Docker network, then redeploy.";
  }
  if (/ENOENT|ENOTEMPTY|TAR_ENTRY_ERROR/i.test(raw) && /node_modules/i.test(raw)) {
    return "Dependency install was interrupted. Redeploy to retry with a clean npm install.";
  }
  if (/Command failed: docker/i.test(raw)) {
    return "Docker build command failed. See npm output below.";
  }
  return raw.split("\n")[0]?.slice(0, 240) || "Container build failed.";
}

async function writeEnvFile(path: string, envVarsJson: string) {
  const lines = [
    "NEXT_TELEMETRY_DISABLED=1",
    "NODE_ENV=production",
    "npm_config_fetch_retries=8",
    "npm_config_fetch_retry_mintimeout=20000",
    "npm_config_fetch_retry_maxtimeout=120000",
    "npm_config_fetch_timeout=300000",
    ...deploymentEnv(envVarsJson),
  ];
  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
}

async function progress(hostingId: string, deploymentId: string, log: string, status = "BUILDING") {
  await Promise.all([
    prisma.hostingDeployment.update({ where: { id: deploymentId }, data: { status, log } }),
    prisma.hostingAccount.update({ where: { id: hostingId }, data: { deployStatus: status, lastDeployLog: log } }),
  ]);
}

async function pathExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runContainerBuild(input: { hostingId: string; deploymentId: string; userId: string }) {
  const account = await prisma.hostingAccount.findUnique({
    where: { id: input.hostingId },
    include: { customer: { include: { user: { include: { githubConnection: true } } } } },
  });
  if (!account?.githubRepo || !account.customer.user.githubConnection) {
    throw new Error("GitHub source is not connected.");
  }

  const slug = account.previewSlug ?? account.id;
  const runtime = frameworkRuntime(account.framework);
  const startCommand = account.startCommand?.trim() || runtime.startCommand;
  const runtimeMode = startCommand ? "server" : "static";

  let log = "Starting isolated build container...";
  const workspace = await mkdtemp(join(tmpdir(), "mydomain-build-"));
  const archive = join(workspace, "source.tar.gz");
  const source = join(workspace, "source");
  const envFile = join(workspace, "build.env");
  const artifact = join(ARTIFACT_ROOT, slug);
  const runtimeDir = join(RUNTIME_ROOT, slug);

  try {
    await progress(input.hostingId, input.deploymentId, log);
    await exec("docker", ["info"], { timeout: 10_000 });
    log += "\nDocker runtime available.";
    await progress(input.hostingId, input.deploymentId, log);

    const [owner, repo] = account.githubRepo.split("/");
    const token = decryptSecret(account.customer.user.githubConnection.accessTokenEnc);
    log += `\nDownloading ${account.githubRepo}@${account.githubBranch}...`;
    await progress(input.hostingId, input.deploymentId, log);
    await mkdir(source);
    await writeFile(archive, await githubArchive(token, owner, repo, account.githubBranch));
    await exec("tar", ["-xzf", archive, "--strip-components=1", "-C", source], { timeout: 30_000 });

    const root = account.rootDirectory ? join(source, account.rootDirectory) : source;
    const outputDirectory = outputDirectories[account.framework ?? ""] ?? "dist";
    const buildCommand = account.buildCommand || "npm run build";
    const hasBuild = Boolean(account.buildCommand);
    log += hasBuild
      ? `\nInstalling dependencies for ${account.framework ?? "detected framework"}...\nRunning ${buildCommand}...`
      : "\nStatic source detected; no dependency installation required.";
    log += `\nRuntime mode: ${runtimeMode}.`;
    await progress(input.hostingId, input.deploymentId, log);

    if (hasBuild) {
      await writeEnvFile(envFile, account.envVarsJson);
      await exec("docker", ["volume", "create", NPM_CACHE_VOLUME], { timeout: 15_000 }).catch(() => undefined);
      await exec(
        "docker",
        [
          "run",
          "--rm",
          "--cpus=2",
          "--memory=2g",
          "--pids-limit=512",
          "--name",
          `mydomain-build-${input.deploymentId}`,
          "--tmpfs",
          "/tmp:rw,nosuid,nodev,size=512m",
          "--env-file",
          envFile,
          "-v",
          `${NPM_CACHE_VOLUME}:/root/.npm`,
          "-v",
          `${source}:/workspace`,
          "-w",
          `/workspace${account.rootDirectory ? `/${account.rootDirectory}` : ""}`,
          BUILD_IMAGE,
          "sh",
          "-lc",
          [
            "npm config set fetch-retries 8",
            "npm config set fetch-retry-mintimeout 20000",
            "npm config set fetch-retry-maxtimeout 120000",
            "npm config set fetch-timeout 300000",
            "rm -rf node_modules",
            "npm install --no-audit --no-fund --prefer-offline",
            buildCommand,
          ].join(" && "),
        ],
        { timeout: 20 * 60_000, maxBuffer: 4 * 1024 * 1024 },
      );
    }

    await stopRuntimeContainer(slug);
    await rm(artifact, { recursive: true, force: true });
    await mkdir(artifact, { recursive: true });

    if (runtimeMode === "server") {
      log += "\nPackaging Node server runtime (SSR / API / database-ready)...";
      await progress(input.hostingId, input.deploymentId, log);
      await rm(runtimeDir, { recursive: true, force: true });
      await mkdir(RUNTIME_ROOT, { recursive: true });
      await cp(source, runtimeDir, { recursive: true });

      const builtOutput = join(/* turbopackIgnore: true */ root, outputDirectory);
      if (await pathExists(builtOutput) && outputDirectory !== ".") {
        await mkdir(artifact, { recursive: true });
        await cp(builtOutput, join(artifact, outputDirectory), { recursive: true }).catch(() => undefined);
      }

      const hostPort = await allocateRuntimePort(account.id);
      log += `\nStarting app container on 127.0.0.1:${hostPort}...`;
      await progress(input.hostingId, input.deploymentId, log);

      const container = await startRuntimeContainer({
        slug,
        runtimeDir,
        rootDirectory: account.rootDirectory,
        startCommand,
        envVarsJson: account.envVarsJson,
        hostPort,
        containerPort: runtime.containerPort,
      });

      log += "\nWaiting for application health check...";
      await progress(input.hostingId, input.deploymentId, log);
      await waitForRuntimeHealthy(hostPort);

      const previewUrl = buildPreviewUrl({ slug, runtimeMode: "server", runtimePort: hostPort });
      log += `\nServer runtime is live at ${previewUrl}.`;
      log += "\nPass DATABASE_URL (and other secrets) as environment variables for database-backed apps.";
      log += "\nDeployment completed successfully.";

      await Promise.all([
        prisma.hostingDeployment.update({
          where: { id: input.deploymentId },
          data: { status: "LIVE", log, previewUrl },
        }),
        prisma.hostingAccount.update({
          where: { id: input.hostingId },
          data: {
            deployStatus: "LIVE",
            lastDeployLog: log,
            lastDeployAt: new Date(),
            runtimeMode: "server",
            runtimePort: hostPort,
            runtimeContainer: container,
            startCommand,
            previewSlug: slug,
            previewUrl,
          },
        }),
      ]);
      return;
    }

    const builtOutput = join(/* turbopackIgnore: true */ root, outputDirectory);
    await cp(builtOutput, artifact, { recursive: true });
    const previewUrl = buildPreviewUrl({ slug, runtimeMode: "static" });
    log += `\nBuild output collected from ${outputDirectory}.`;
    log += `\nStatic preview ready at ${previewUrl}.`;
    log += "\nDeployment completed successfully.";

    await Promise.all([
      prisma.hostingDeployment.update({
        where: { id: input.deploymentId },
        data: { status: "LIVE", log, previewUrl },
      }),
      prisma.hostingAccount.update({
        where: { id: input.hostingId },
        data: {
          deployStatus: "LIVE",
          lastDeployLog: log,
          lastDeployAt: new Date(),
          runtimeMode: "static",
          runtimePort: null,
          runtimeContainer: null,
          startCommand: null,
          previewSlug: slug,
          previewUrl,
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Container build failed.";
    const commandOutput =
      error && typeof error === "object"
        ? String((error as { stderr?: string; stdout?: string }).stderr ?? (error as { stdout?: string }).stdout ?? "")
        : "";
    const combined = `${message}\n${commandOutput}`;
    log += `\nDeployment failed: ${friendlyBuildError(combined)}`;
    if (commandOutput) log += `\n${redactBuildOutput(commandOutput, account.envVarsJson)}`;
    else log += `\n${redactBuildOutput(message, account.envVarsJson)}`;
    await stopRuntimeContainer(slug).catch(() => undefined);
    await progress(input.hostingId, input.deploymentId, log, "FAILED");
    throw error;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function readArtifactFile(slug: string, path: string) {
  const root = join(ARTIFACT_ROOT, slug);
  const resolved = join(root, path.replace(/^\/+/, ""));
  if (!resolved.startsWith(`${root}/`) && resolved !== root) return null;
  try {
    return await readFile(resolved);
  } catch {
    return null;
  }
}

export async function removeDeploymentArtifacts(slug: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return;
  await rm(join(ARTIFACT_ROOT, slug), { recursive: true, force: true });
  await rm(join(RUNTIME_ROOT, slug), { recursive: true, force: true });
}

export async function stopDeploymentContainer(deploymentId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(deploymentId)) return;
  await exec("docker", ["rm", "--force", `mydomain-build-${deploymentId}`], { timeout: 10_000 }).catch(
    () => undefined,
  );
}

export { stopRuntimeContainer };
