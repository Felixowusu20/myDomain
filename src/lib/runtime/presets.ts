export type RuntimeMode = "static" | "server";

export type FrameworkRuntime = {
  mode: RuntimeMode;
  /** Command executed inside the runtime container (cwd = app root). */
  startCommand: string;
  /** Port the app listens on inside the container. */
  containerPort: number;
};

const SERVER: Record<string, FrameworkRuntime> = {
  "Next.js": {
    mode: "server",
    startCommand: "npx next start -H 0.0.0.0 -p 3000",
    containerPort: 3000,
  },
  Nuxt: {
    mode: "server",
    startCommand: "node .output/server/index.mjs",
    containerPort: 3000,
  },
  Remix: {
    mode: "server",
    startCommand: "npx remix-serve ./build/index.js",
    containerPort: 3000,
  },
  SvelteKit: {
    mode: "server",
    startCommand: "node build",
    containerPort: 3000,
  },
};

const STATIC: FrameworkRuntime = {
  mode: "static",
  startCommand: "",
  containerPort: 3000,
};

export function frameworkRuntime(frameworkName: string | null | undefined): FrameworkRuntime {
  if (!frameworkName) return STATIC;
  return SERVER[frameworkName] ?? STATIC;
}

export function isServerFramework(frameworkName: string | null | undefined) {
  return frameworkRuntime(frameworkName).mode === "server";
}
