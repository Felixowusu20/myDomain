import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { issueSession } from "@/lib/session";
import { GithubError, decodeGithubFile, exchangeGithubCode, githubBranches, githubContents, githubEmails, githubRepo, githubRepos, githubUser, pickGithubEmail, type GithubRepo } from "@/lib/github/api";
import { detectFramework, parseEnvExample, repoNeedsDatabase, summarizeChecks, type DeployCheck, type FrameworkPreset } from "@/lib/github/checks";

export type GithubPublicConnection = {
  connected: boolean;
  login: string | null;
  avatarUrl: string | null;
};

export type InspectedRepo = {
  repo: {
    fullName: string;
    name: string;
    private: boolean;
    description: string | null;
    htmlUrl: string;
    defaultBranch: string;
    language: string | null;
    updatedAt: string;
  };
  branches: string[];
  framework: FrameworkPreset;
  rootDirectory: string;
  files: string[];
  suggestedEnvKeys: string[];
  checks: DeployCheck[];
  canDeploy: boolean;
  summary: string;
};

async function tokenForUser(userId: string) {
  const connection = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!connection) throw new GithubError("Connect GitHub to import a repository.");
  return decryptSecret(connection.accessTokenEnc);
}

export async function getGithubConnection(userId: string): Promise<GithubPublicConnection> {
  const connection = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!connection) return { connected: false, login: null, avatarUrl: null };
  return {
    connected: true,
    login: connection.githubLogin,
    avatarUrl: connection.avatarUrl,
  };
}

export async function saveGithubConnection(input: {
  userId: string;
  githubId: string;
  githubLogin: string;
  avatarUrl?: string | null;
  accessToken: string;
  scope: string;
}) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: {
        githubId: input.githubId,
        githubLogin: input.githubLogin,
        avatarUrl: input.avatarUrl || undefined,
      },
    }),
    prisma.gitHubConnection.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        githubId: input.githubId,
        githubLogin: input.githubLogin,
        avatarUrl: input.avatarUrl ?? null,
        accessTokenEnc: encryptSecret(input.accessToken),
        scope: input.scope,
      },
      update: {
        githubId: input.githubId,
        githubLogin: input.githubLogin,
        avatarUrl: input.avatarUrl ?? null,
        accessTokenEnc: encryptSecret(input.accessToken),
        scope: input.scope,
      },
    }),
  ]);
}

export async function disconnectGithub(userId: string) {
  await prisma.gitHubConnection.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: { githubId: null, githubLogin: null },
  });
}

export async function completeGithubOAuth(input: {
  code: string;
  intent: "login" | "connect";
  userId?: string;
}) {
  const { accessToken, scope } = await exchangeGithubCode(input.code);
  const profile = await githubUser(accessToken);
  const emails = await githubEmails(accessToken).catch(() => []);
  const email = pickGithubEmail(emails, profile.email)?.trim().toLowerCase();
  if (!email) throw new GithubError("GitHub did not share a verified email.");

  const githubId = String(profile.id);
  const name = profile.name?.trim() || profile.login;
  const existingGithub = await prisma.user.findUnique({
    where: { githubId },
    include: { customer: true, adminProfile: true },
  });
  const existingEmail = await prisma.user.findUnique({
    where: { email },
    include: { customer: true, adminProfile: true },
  });

  if (input.intent === "connect") {
    if (!input.userId) throw new GithubError("Please sign in to connect GitHub.");
    if (existingGithub && existingGithub.id !== input.userId) {
      throw new GithubError("This GitHub account is already connected to another user.");
    }
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { customer: true, adminProfile: true },
    });
    if (!user || user.role !== "CUSTOMER") throw new GithubError("Please sign in to connect GitHub.");
    await saveGithubConnection({
      userId: user.id,
      githubId,
      githubLogin: profile.login,
      avatarUrl: profile.avatar_url,
      accessToken,
      scope,
    });
    return { redirectTo: "/sites" };
  }

  if (existingGithub && existingGithub.status === "SUSPENDED") {
    throw new GithubError("This account has been suspended.", 403);
  }
  if (existingEmail && existingEmail.status === "SUSPENDED") {
    throw new GithubError("This account has been suspended.", 403);
  }
  if (existingGithub && existingEmail && existingGithub.id !== existingEmail.id) {
    throw new GithubError("This GitHub account is already connected to another user.");
  }
  if (existingEmail?.role === "ADMIN") {
    throw new GithubError("Admin accounts sign in from the admin page.");
  }

  let user = existingGithub ?? existingEmail;
  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: "",
        role: "CUSTOMER",
        avatarUrl: profile.avatar_url,
        emailVerifiedAt: new Date(),
        githubId,
        githubLogin: profile.login,
        customer: { create: {} },
      },
      include: { customer: true, adminProfile: true },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId,
        githubLogin: profile.login,
        avatarUrl: user.avatarUrl || profile.avatar_url,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        name: user.name || name,
      },
      include: { customer: true, adminProfile: true },
    });
  }

  await saveGithubConnection({
    userId: user.id,
    githubId,
    githubLogin: profile.login,
    avatarUrl: profile.avatar_url,
    accessToken,
    scope,
  });

  if (user.customer?.totpEnabled) {
    const { createCustomerTotpPendingToken } = await import(
      "@/lib/security/customer-totp-pending"
    );
    const pendingToken = await createCustomerTotpPendingToken(user.id);
    return {
      redirectTo: "/login?step=2fa",
      needsTotp: true as const,
      pendingToken,
    };
  }

  await issueSession(user);
  return { redirectTo: "/sites" };
}

export async function listGithubRepos(userId: string, query = "", page = 1) {
  const token = await tokenForUser(userId);
  const repos = await githubRepos(token, page, 40);
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? repos.filter((repo) => repo.full_name.toLowerCase().includes(needle) || (repo.description ?? "").toLowerCase().includes(needle))
    : repos;
  return {
    repos: filtered.map(publicRepo),
    page,
    hasMore: repos.length >= 40,
  };
}

function publicRepo(repo: GithubRepo) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    description: repo.description,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    language: repo.language,
    updatedAt: repo.updated_at,
    fork: repo.fork,
    owner: repo.owner.login,
    avatarUrl: repo.owner.avatar_url,
  };
}

export async function inspectGithubRepo(input: {
  userId: string;
  repo: string;
  branch?: string;
  rootDirectory?: string;
  envKeys?: string[];
}) {
  const token = await tokenForUser(input.userId);
  const fullName = parseRepoName(input.repo);
  const [owner, name] = fullName.split("/");
  let repo: GithubRepo;
  try {
    repo = await githubRepo(token, owner, name);
  } catch (error) {
    if (error instanceof GithubError && error.status === 404) {
      const viewer = await githubUser(token).catch(() => null);
      const account = viewer ? `@${viewer.login}` : "the connected GitHub account";
      throw new GithubError(
        `GitHub account ${account} cannot access ${fullName}. Check the repository owner/name, reconnect the GitHub account that owns it, or grant your organization access to this OAuth app.`,
        404,
      );
    }
    throw error;
  }
  const branches = await githubBranches(token, owner, name);
  const branch = (input.branch ?? repo.default_branch).trim() || repo.default_branch;
  const rootDirectory = (input.rootDirectory ?? "").replace(/^\/+|\/+$/g, "");
  const listing = await githubContents(token, owner, name, rootDirectory, branch).catch(() => []);
  const files = Array.isArray(listing) ? listing.map((item) => item.name) : listing ? [listing.name] : [];
  const packageFile = files.find((file) => file === "package.json");
  let pkg: Record<string, unknown> | null = null;
  if (packageFile) {
    const raw = await githubContents(
      token,
      owner,
      name,
      rootDirectory ? `${rootDirectory}/package.json` : "package.json",
      branch,
    );
    try {
      pkg = JSON.parse(decodeGithubFile(raw)) as Record<string, unknown>;
    } catch {
      pkg = null;
    }
  }
  const envExampleName = files.find((file) => file === ".env.example" || file === ".env.sample");
  let suggestedEnvKeys: string[] = [];
  if (envExampleName) {
    const raw = await githubContents(
      token,
      owner,
      name,
      rootDirectory ? `${rootDirectory}/${envExampleName}` : envExampleName,
      branch,
    );
    suggestedEnvKeys = parseEnvExample(decodeGithubFile(raw));
  }
  const framework = detectFramework(pkg, files);
  const envKeys = input.envKeys ?? [];
  const missingEnv = suggestedEnvKeys.filter((key) => !envKeys.includes(key));
  const needsDatabase = repoNeedsDatabase(pkg, files);
  const hasDatabaseUrl = envKeys.includes("DATABASE_URL");
  const checks: DeployCheck[] = [
    {
      id: "access",
      label: "Repository access",
      status: "pass",
      detail: repo.private ? "Private repository is readable with your GitHub account." : "Public repository is readable.",
    },
    {
      id: "archived",
      label: "Repository status",
      status: repo.archived || repo.disabled ? "fail" : "pass",
      detail: repo.archived || repo.disabled ? "This repository is archived or disabled." : "Repository is active.",
    },
    {
      id: "empty",
      label: "Source files",
      status: repo.size === 0 || files.length === 0 ? "fail" : "pass",
      detail: repo.size === 0 || files.length === 0 ? "This repository looks empty." : `${files.length} items in ${rootDirectory || "/"}`,
    },
    {
      id: "branch",
      label: "Production branch",
      status: branches.some((item) => item.name === branch) ? "pass" : "fail",
      detail: branches.some((item) => item.name === branch)
        ? `Deploying from ${branch}.`
        : `Branch ${branch} was not found.`,
    },
    {
      id: "framework",
      label: "Framework",
      status: framework.id === "other" ? "warn" : "pass",
      detail:
        framework.id === "other"
          ? "No framework preset matched. Preview hosting will still be created."
          : `Detected ${framework.name} (${framework.runtimeMode === "server" ? "SSR/server runtime" : "static"}).`,
    },
    {
      id: "runtime",
      label: "Runtime",
      status: "pass",
      detail:
        framework.runtimeMode === "server"
          ? `Will run as a live Node server (${framework.startCommand || "npm start"}). API routes and databases work.`
          : "Will publish static files only.",
    },
    {
      id: "build",
      label: "Build command",
      status: framework.buildCommand ? "pass" : "warn",
      detail: framework.buildCommand || "No build script found. Static files will be used if present.",
    },
    {
      id: "database",
      label: "Database",
      status: needsDatabase && !hasDatabaseUrl ? "warn" : "pass",
      detail: needsDatabase
        ? hasDatabaseUrl
          ? "DATABASE_URL is set for this deploy."
          : "This app looks database-backed. Add DATABASE_URL (Neon, PlanetScale, etc.) in environment variables."
        : "No database client detected.",
    },
    {
      id: "env",
      label: "Environment variables",
      status: missingEnv.length ? "warn" : "pass",
      detail: missingEnv.length
        ? `Add ${missingEnv.slice(0, 6).join(", ")}${missingEnv.length > 6 ? "…" : ""} before going live.`
        : suggestedEnvKeys.length
          ? "Suggested env keys from .env.example are set."
          : "No .env.example found.",
    },
  ];
  const canDeploy = checks.every((item) => item.status !== "fail");
  return {
    repo: {
      fullName: repo.full_name,
      name: repo.name,
      private: repo.private,
      description: repo.description,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch,
      language: repo.language,
      updatedAt: repo.updated_at,
    },
    branches: branches.map((item) => item.name),
    framework,
    rootDirectory,
    files,
    suggestedEnvKeys,
    checks,
    canDeploy,
    summary: summarizeChecks(checks),
  } satisfies InspectedRepo;
}

export async function getGithubPreviewFile(input: {
  userId: string;
  repo: string;
  branch: string;
  path: string;
}) {
  const token = await tokenForUser(input.userId);
  const fullName = parseRepoName(input.repo);
  const [owner, name] = fullName.split("/");
  return githubContents(token, owner, name, input.path, input.branch);
}

export function newOauthState() {
  return randomBytes(24).toString("base64url");
}

function parseRepoName(input: string) {
  const raw = input.trim().replace(/\/+$/, "");
  const fromUrl = raw.match(/github\.com[:/]([^/]+)\/([^/#?]+)/i);
  const compact = raw.match(/^([\w.-]+)\/([\w.-]+)$/);
  const owner = fromUrl?.[1] ?? compact?.[1];
  const repo = (fromUrl?.[2] ?? compact?.[2])?.replace(/\.git$/i, "");
  if (!owner || !repo) throw new GithubError("Enter a GitHub repo like owner/repo");
  return `${owner}/${repo}`;
}

export function safeNextPath(value: string | null | undefined, fallback = "/sites") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/admin")) return fallback;
  return value;
}
