import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { prisma } from "@/lib/db";

const exec = promisify(execFile);
const BUILD_IMAGE = process.env.BUILD_IMAGE?.trim() || "node:22-alpine";
const PORT_MIN = Number(process.env.RUNTIME_PORT_MIN ?? 4100);
const PORT_MAX = Number(process.env.RUNTIME_PORT_MAX ?? 4599);

export function runtimeContainerName(slug: string) {
  return `mydomain-run-${slug}`;
}

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

async function isPortFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function allocateRuntimePort(excludeHostingId?: string) {
  const used = await prisma.hostingAccount.findMany({
    where: {
      runtimePort: { not: null },
      ...(excludeHostingId ? { id: { not: excludeHostingId } } : {}),
    },
    select: { runtimePort: true },
  });
  const taken = new Set(used.map((row) => row.runtimePort).filter((port): port is number => port != null));
  for (let port = PORT_MIN; port <= PORT_MAX; port += 1) {
    if (taken.has(port)) continue;
    if (await isPortFree(port)) return port;
  }
  throw new Error("No free runtime ports available. Free a site or expand RUNTIME_PORT_MIN/MAX.");
}

export async function stopRuntimeContainer(slug: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return;
  const name = runtimeContainerName(slug);
  await exec("docker", ["rm", "--force", name], { timeout: 20_000 }).catch(() => undefined);
}

export async function startRuntimeContainer(input: {
  slug: string;
  runtimeDir: string;
  rootDirectory: string;
  startCommand: string;
  envVarsJson: string;
  hostPort: number;
  containerPort?: number;
}) {
  const containerPort = input.containerPort ?? 3000;
  const name = runtimeContainerName(input.slug);
  await stopRuntimeContainer(input.slug);

  const workdir = `/app${input.rootDirectory ? `/${input.rootDirectory}` : ""}`;
  const envDir = await mkdtemp(join(tmpdir(), "mydomain-run-env-"));
  const envFile = join(envDir, "runtime.env");
  await writeFile(
    envFile,
    [
      `PORT=${containerPort}`,
      "HOSTNAME=0.0.0.0",
      "HOST=0.0.0.0",
      "NEXT_TELEMETRY_DISABLED=1",
      "NODE_ENV=production",
      ...deploymentEnv(input.envVarsJson),
      "",
    ].join("\n"),
    "utf8",
  );

  try {
    await exec(
      "docker",
      [
        "run",
        "-d",
        "--name",
        name,
        "--restart",
        "unless-stopped",
        "--cpus=0.75",
        "--memory=768m",
        "--pids-limit=192",
        "-p",
        `127.0.0.1:${input.hostPort}:${containerPort}`,
        "--env-file",
        envFile,
        "-v",
        `${input.runtimeDir}:/app`,
        "-w",
        workdir,
        BUILD_IMAGE,
        "sh",
        "-lc",
        input.startCommand,
      ],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
    );
  } finally {
    await rm(envDir, { recursive: true, force: true });
  }

  return name;
}

export async function waitForRuntimeHealthy(hostPort: number, timeoutMs = 90_000) {
  const started = Date.now();
  let lastError = "Runtime did not become ready.";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${hostPort}/`, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(3_000),
      });
      if (response.status > 0) return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Waiting for runtime...";
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`App runtime failed health checks: ${lastError}`);
}

export async function proxyToRuntime(input: {
  hostPort: number;
  path: string;
  request: Request;
}) {
  const incoming = new URL(input.request.url);
  const target = new URL(input.path || "/", `http://127.0.0.1:${input.hostPort}`);
  target.search = incoming.search;

  const headers = new Headers(input.request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  headers.set("x-forwarded-for", headers.get("x-forwarded-for") ?? "127.0.0.1");

  const method = input.request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await input.request.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
