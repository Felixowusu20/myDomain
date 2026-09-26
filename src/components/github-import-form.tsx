"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { BusyLabel } from "@/components/spinner";
import { DeployLogConsole } from "@/components/deploy-log-console";
import { EnvVarsEditor } from "@/components/env-vars-editor";

type EnvRow = { key: string; value: string };
type Check = { id: string; label: string; status: "pass" | "fail" | "warn"; detail: string };
type Inspection = {
  repo: { fullName: string; private: boolean; htmlUrl: string; defaultBranch: string };
  branches: string[];
  framework: { id: string; name: string; buildCommand: string; outputDirectory: string; installCommand: string };
  rootDirectory: string;
  suggestedEnvKeys: string[];
  checks: Check[];
  canDeploy: boolean;
  summary: string;
};

function CheckIcon({ status }: { status: Check["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />;
  if (status === "fail") return <CircleX className="h-4 w-4 text-[var(--danger)]" />;
  return <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />;
}

export function GithubImportForm({ repo }: { repo: string }) {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const [rootDirectory, setRootDirectory] = useState("");
  const [envVars, setEnvVars] = useState<EnvRow[]>([{ key: "", value: "" }]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const seededEnv = useRef(false);

  const envKeys = useMemo(
    () => envVars.map((row) => row.key.trim()).filter(Boolean),
    [envVars],
  );
  const missingEnvKeys = useMemo(
    () =>
      (inspection?.suggestedEnvKeys ?? []).filter(
        (key) => !envVars.some((row) => row.key.trim() === key && row.value.trim()),
      ),
    [envVars, inspection?.suggestedEnvKeys],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ repo });
      if (branch) params.set("branch", branch);
      if (rootDirectory) params.set("root", rootDirectory);
      if (envKeys.length) params.set("env", envKeys.join(","));
      fetch(`/api/github/inspect?${params}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            setInspection(null);
            return;
          }
          setError("");
          setInspection(data);
          setBranch((current) => current || data.repo.defaultBranch);
          if (!seededEnv.current && data.suggestedEnvKeys?.length) {
            seededEnv.current = true;
            setEnvVars((current) => {
              const existing = new Set(current.map((row) => row.key).filter(Boolean));
              const extra = (data.suggestedEnvKeys as string[])
                .filter((key: string) => !existing.has(key))
                .map((key: string) => ({ key, value: "" }));
              const usable = current.filter((row) => row.key || row.value);
              const next = [...usable, ...extra];
              return next.length ? next : [{ key: "", value: "" }];
            });
          }
        })
        .catch(() => setError("Could not inspect this repository."))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [repo, branch, rootDirectory, envKeys.join(",")]);

  async function deploy() {
    if (missingEnvKeys.length) {
      setError(`Add values for: ${missingEnvKeys.slice(0, 5).join(", ")}${missingEnvKeys.length > 5 ? "…" : ""}.`);
      return;
    }
    setDeploying(true);
    setError("");
    setDeploymentLogs([
      "Checking repository access...",
      `Detected framework: ${inspection?.framework.name ?? "Other"}.`,
      `Build check: ${inspection?.framework.buildCommand || "No build command"}.`,
      "Publishing preview...",
    ]);
    const response = await fetch("/api/hosting/trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        githubRepo: repo,
        githubBranch: branch,
        rootDirectory,
        envVars: envVars.filter((row) => row.key.trim()),
      }),
    });
    const data = await response.json();
    setDeploying(false);
    if (!response.ok) {
      setDeploymentLogs((lines) => [...lines, `Deployment failed: ${data.error ?? "Unknown error"}`]);
      setError(data.error ?? "Could not deploy");
      return;
    }
    setDeploymentLogs((lines) => [...lines, "Deployment completed successfully."]);
    router.push(`/hosting/${data.account.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="card space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void deploy();
        }}
      >
        <label className="field">
          <span>Repository</span>
          <input value={repo} readOnly />
        </label>
        <label className="field">
          <span>Branch</span>
          <select value={branch} onChange={(event) => setBranch(event.target.value)}>
            {(inspection?.branches ?? (branch ? [branch] : [])).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Root directory</span>
          <input
            value={rootDirectory}
            onChange={(event) => setRootDirectory(event.target.value)}
            placeholder="./"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Framework</span>
            {inspection?.framework.name ?? (loading ? "Detecting…" : "Other")}
          </p>
          <p className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Build command</span>
            {inspection?.framework.buildCommand || "None"}
          </p>
        </div>
        <EnvVarsEditor
          value={envVars}
          onChange={setEnvVars}
          lockedKeys={inspection?.suggestedEnvKeys ?? []}
          hint="After importing this repo: paste your whole .env into “Paste .env here” or the first KEY field. New rows are added and KEY + value fill in automatically."
        />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {deploymentLogs.length ? (
          <DeployLogConsole
            lines={deploymentLogs}
            status={deploying ? "BUILDING" : error ? "FAILED" : "LIVE"}
            title="Deployment log"
          />
        ) : null}
        <button className="btn btn-hot w-full" disabled={deploying || loading || inspection?.canDeploy === false}>
          <BusyLabel busy={deploying} busyText="Deploying">
            Deploy
          </BusyLabel>
        </button>
        <p className="text-xs text-[var(--muted)]">
          Checks run against GitHub before preview hosting is created. After 14 days, buy a plan and connect your domain.
        </p>
      </form>
      <section className="card space-y-3 p-5">
        <p className="font-extrabold text-[var(--navy)]">Deployment checks</p>
        <p className="text-sm text-[var(--muted)]">{loading ? "Running checks…" : inspection?.summary}</p>
        <div className="space-y-2">
          {(inspection?.checks ?? []).map((check) => (
            <div key={check.id} className="rounded-xl border border-[var(--line)] px-3 py-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <CheckIcon status={check.status} />
                {check.label}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
