export type DeployCheck = {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

export type FrameworkPreset = {
  id: string;
  name: string;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  runtimeMode: "static" | "server";
  startCommand: string;
};

const FRAMEWORKS: Array<{
  id: string;
  name: string;
  match: (pkg: Record<string, unknown>, files: string[]) => boolean;
  buildCommand: string;
  outputDirectory: string;
  runtimeMode: "static" | "server";
  startCommand: string;
}> = [
  {
    id: "nextjs",
    name: "Next.js",
    match: (pkg, files) => hasDep(pkg, "next") || files.some((name) => name.startsWith("next.config")),
    buildCommand: "next build",
    outputDirectory: ".next",
    runtimeMode: "server",
    startCommand: "npx next start -H 0.0.0.0 -p 3000",
  },
  {
    id: "nuxt",
    name: "Nuxt",
    match: (pkg, files) => hasDep(pkg, "nuxt") || files.some((name) => name.startsWith("nuxt.config")),
    buildCommand: "nuxt build",
    outputDirectory: ".output",
    runtimeMode: "server",
    startCommand: "node .output/server/index.mjs",
  },
  {
    id: "remix",
    name: "Remix",
    match: (pkg) => hasDep(pkg, "@remix-run/dev") || hasDep(pkg, "@remix-run/node"),
    buildCommand: "remix build",
    outputDirectory: "build",
    runtimeMode: "server",
    startCommand: "npx remix-serve ./build/index.js",
  },
  {
    id: "astro",
    name: "Astro",
    match: (pkg, files) => hasDep(pkg, "astro") || files.some((name) => name.startsWith("astro.config")),
    buildCommand: "astro build",
    outputDirectory: "dist",
    runtimeMode: "static",
    startCommand: "",
  },
  {
    id: "sveltekit",
    name: "SvelteKit",
    match: (pkg) => hasDep(pkg, "@sveltejs/kit"),
    buildCommand: "vite build",
    outputDirectory: "build",
    runtimeMode: "server",
    startCommand: "node build",
  },
  {
    id: "vite",
    name: "Vite",
    match: (pkg, files) => hasDep(pkg, "vite") || files.some((name) => name.startsWith("vite.config")),
    buildCommand: "vite build",
    outputDirectory: "dist",
    runtimeMode: "static",
    startCommand: "",
  },
  {
    id: "cra",
    name: "Create React App",
    match: (pkg) => hasDep(pkg, "react-scripts"),
    buildCommand: "react-scripts build",
    outputDirectory: "build",
    runtimeMode: "static",
    startCommand: "",
  },
  {
    id: "gatsby",
    name: "Gatsby",
    match: (pkg) => hasDep(pkg, "gatsby"),
    buildCommand: "gatsby build",
    outputDirectory: "public",
    runtimeMode: "static",
    startCommand: "",
  },
  {
    id: "vue",
    name: "Vue",
    match: (pkg) => hasDep(pkg, "vue"),
    buildCommand: "vite build",
    outputDirectory: "dist",
    runtimeMode: "static",
    startCommand: "",
  },
  {
    id: "react",
    name: "React",
    match: (pkg) => hasDep(pkg, "react"),
    buildCommand: "npm run build",
    outputDirectory: "dist",
    runtimeMode: "static",
    startCommand: "",
  },
];

function hasDep(pkg: Record<string, unknown>, name: string) {
  const deps = {
    ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
  };
  return Boolean(deps[name]);
}

export function detectFramework(pkg: Record<string, unknown> | null, files: string[]): FrameworkPreset {
  const found = pkg ? FRAMEWORKS.find((item) => item.match(pkg, files)) : undefined;
  const scripts = (pkg?.scripts as Record<string, string> | undefined) ?? {};
  if (found) {
    const serverFromStart =
      found.runtimeMode === "static" && Boolean(scripts.start) && !files.includes("index.html")
        ? ({
            runtimeMode: "server" as const,
            startCommand: "npm run start -- --hostname 0.0.0.0 --port 3000",
          })
        : null;
    return {
      id: found.id,
      name: found.name,
      buildCommand: scripts.build ? "npm run build" : found.buildCommand,
      outputDirectory: found.outputDirectory,
      installCommand: "npm install",
      runtimeMode: serverFromStart?.runtimeMode ?? found.runtimeMode,
      startCommand: serverFromStart?.startCommand ?? found.startCommand,
    };
  }
  if (scripts.start && pkg) {
    return {
      id: "node",
      name: "Node.js",
      buildCommand: scripts.build ? "npm run build" : "",
      outputDirectory: "dist",
      installCommand: "npm install",
      runtimeMode: "server",
      startCommand: "npm run start",
    };
  }
  if (files.includes("index.html")) {
    return {
      id: "static",
      name: "Other",
      buildCommand: scripts.build ?? "",
      outputDirectory: ".",
      installCommand: "",
      runtimeMode: "static",
      startCommand: "",
    };
  }
  return {
    id: "other",
    name: "Other",
    buildCommand: scripts.build ? "npm run build" : "",
    outputDirectory: "dist",
    installCommand: pkg ? "npm install" : "",
    runtimeMode: "static",
    startCommand: "",
  };
}

export function repoNeedsDatabase(pkg: Record<string, unknown> | null, files: string[]) {
  if (!pkg && files.length === 0) return false;
  if (files.some((name) => name.includes("prisma") || name === "drizzle.config.ts" || name === "drizzle.config.js")) {
    return true;
  }
  if (!pkg) return false;
  return (
    hasDep(pkg, "@prisma/client") ||
    hasDep(pkg, "prisma") ||
    hasDep(pkg, "mongoose") ||
    hasDep(pkg, "pg") ||
    hasDep(pkg, "mysql2") ||
    hasDep(pkg, "better-sqlite3") ||
    hasDep(pkg, "drizzle-orm") ||
    hasDep(pkg, "sequelize") ||
    hasDep(pkg, "typeorm")
  );
}

export function parseEnvExample(raw: string) {
  const keys: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.replace(/^export\s+/, "").split("=")[0]?.trim();
    if (key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && !keys.includes(key)) keys.push(key);
  }
  return keys.slice(0, 40);
}

export function summarizeChecks(checks: DeployCheck[]) {
  const failed = checks.filter((item) => item.status === "fail").length;
  const warned = checks.filter((item) => item.status === "warn").length;
  if (failed) return `${failed} check${failed === 1 ? "" : "s"} failed`;
  if (warned) return `Ready with ${warned} warning${warned === 1 ? "" : "s"}`;
  return "All checks passed";
}
