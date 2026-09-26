"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { AlertTriangle, Rocket, Trash2, X } from "lucide-react";
import { BusyLabel } from "@/components/spinner";
import { DeployLogConsole } from "@/components/deploy-log-console";
import { EnvVarsEditor } from "@/components/env-vars-editor";

type EnvRow = { key: string; value: string };

export function SiteProjectForm({
  hostingId,
  githubRepo,
  githubBranch,
  envKeys,
  deployLabel = "Deploy",
}: {
  hostingId: string;
  githubRepo: string;
  githubBranch: string;
  envKeys: string[];
  deployLabel?: string;
}) {
  const router = useRouter();
  const [repo, setRepo] = useState(githubRepo);
  const [branch, setBranch] = useState(githubBranch || "main");
  const [envVars, setEnvVars] = useState<EnvRow[]>(
    envKeys.length ? envKeys.map((key) => ({ key, value: "" })) : [{ key: "", value: "" }],
  );
  const [loading, setLoading] = useState<"save" | "deploy" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!confirmOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && loading !== "delete") setConfirmOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmOpen, loading]);

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setLoading("save");
    setError("");
    setOk("");
    const github = await fetch(`/api/hosting/${hostingId}/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubRepo: repo, githubBranch: branch }),
    });
    const githubData = await github.json();
    if (!github.ok) {
      setLoading(null);
      setError(githubData.error ?? "Could not save the repo");
      return false;
    }
    const env = await fetch(`/api/hosting/${hostingId}/env`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ envVars: envVars.filter((row) => row.key.trim()) }),
    });
    const envData = await env.json();
    setLoading(null);
    if (!env.ok) {
      setError(envData.error ?? "Could not save environment variables");
      return false;
    }
    setOk("Saved.");
    router.refresh();
    return true;
  }

  async function deploy() {
    setDeployLogs(["Saving project settings...", "Queuing redeploy..."]);
    const saved = await save();
    if (!saved) return;
    setLoading("deploy");
    setError("");
    setOk("");
    const response = await fetch(`/api/hosting/${hostingId}/deploy`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setLoading(null);
      setError(data.error ?? "Could not deploy");
      return;
    }
    setOk("Redeploy started. Watch the build log above.");
    router.refresh();
  }

  useEffect(() => {
    if (loading !== "deploy") return;
    const timer = window.setInterval(() => {
      fetch(`/api/hosting/${hostingId}`)
        .then((response) => response.json())
        .then((data) => {
          const log = data.account?.lastDeployLog;
          if (typeof log === "string" && log) setDeployLogs(log.split("\n"));
          const status = data.account?.deployStatus;
          if (status && status !== "BUILDING") {
            setLoading(null);
            if (status === "LIVE") setOk("Redeploy finished successfully.");
            if (status === "FAILED") setError("Redeploy failed. Check the build log.");
            router.refresh();
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hostingId, loading, router]);

  async function remove() {
    setLoading("delete");
    setError("");
    const response = await fetch(`/api/hosting/${hostingId}/delete`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setLoading(null);
      setError(data.error ?? "Could not delete this hosted project");
      return;
    }
    router.push("/hosting");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={save} className="space-y-4">
      <label className="field">
        <span>GitHub repository</span>
        <input
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          placeholder="owner/repo"
          required
        />
      </label>
      <label className="field">
        <span>Branch</span>
        <input value={branch} onChange={(event) => setBranch(event.target.value)} />
      </label>
      <EnvVarsEditor
        value={envVars}
        onChange={setEnvVars}
        hint="Paste one or many KEY=value lines from a .env file. Leave a value blank to keep the saved secret. For database apps, include DATABASE_URL."
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {ok ? <p className="text-sm font-semibold text-[var(--success)]">{ok}</p> : null}
      {loading === "deploy" || deployLogs.length ? (
        <DeployLogConsole
          lines={deployLogs}
          status={loading === "deploy" ? "BUILDING" : error ? "FAILED" : "LIVE"}
          title="Deployment log"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" disabled={loading !== null} type="submit">
          <BusyLabel busy={loading === "save"} busyText="Saving">
            Save
          </BusyLabel>
        </button>
        <button className="btn btn-hot" disabled={loading !== null} type="button" onClick={deploy}>
          <BusyLabel busy={loading === "deploy"} busyText="Redeploying">
            <Rocket className="h-4 w-4" />
            {deployLabel}
          </BusyLabel>
        </button>
        <button
          className="btn btn-ghost text-[var(--danger)]"
          disabled={loading !== null}
          type="button"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete project
        </button>
      </div>
      </form>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,17,31,0.52)] px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && loading !== "delete") setConfirmOpen(false);
          }}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            aria-describedby="delete-project-description"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(196,65,58,0.12)] text-[var(--danger)]">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="delete-project-title" className="text-lg font-extrabold text-[var(--navy)]">
                    Delete this project?
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{repo || "GitHub project"}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost p-2"
                aria-label="Close delete confirmation"
                disabled={loading === "delete"}
                onClick={() => setConfirmOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p id="delete-project-description" className="mt-5 text-sm leading-6 text-[var(--muted)]">
              This removes the hosted project, its preview URL, deployment history, and saved environment variables. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={loading === "delete"}
                onClick={() => setConfirmOpen(false)}
              >
                Keep project
              </button>
              <button type="button" className="btn btn-hot" disabled={loading === "delete"} onClick={() => void remove()}>
                <BusyLabel busy={loading === "delete"} busyText="Deleting">
                  <Trash2 className="h-4 w-4" />
                  Delete project
                </BusyLabel>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
