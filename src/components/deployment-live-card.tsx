"use client";

import { AlertTriangle, ExternalLink, Globe2, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeployLogConsole } from "@/components/deploy-log-console";
import { BusyLabel } from "@/components/spinner";
import { StatusBadge } from "@/components/status-badge";

type DeploymentAccount = {
  id: string;
  previewUrl: string | null;
  previewSlug: string | null;
  githubRepo?: string | null;
  deployStatus: string;
  framework: string | null;
  buildCommand: string | null;
  runtimeMode?: string | null;
  lastDeployLog: string | null;
  domainName?: string | null;
  hasDomains?: boolean;
};

export function DeploymentLiveCard({ account: initial }: { account: DeploymentAccount }) {
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const active = account.deployStatus === "BUILDING" || redeploying;

  useEffect(() => {
    setAccount(initial);
  }, [initial]);

  useEffect(() => {
    if (!active) return;
    const poll = () => {
      fetch(`/api/hosting/${initial.id}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.account) {
            setAccount((current) => ({ ...current, ...data.account }));
            if (data.account.deployStatus && data.account.deployStatus !== "BUILDING") {
              setRedeploying(false);
              router.refresh();
            }
          }
        })
        .catch(() => undefined);
    };
    poll();
    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [active, initial.id, router]);

  useEffect(() => {
    if (!deleteOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) setDeleteOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteOpen, deleting]);

  if (!account.previewUrl) return null;

  async function redeploy() {
    setRedeploying(true);
    setActionError("");
    setAccount((current) => ({
      ...current,
      deployStatus: "BUILDING",
      lastDeployLog: `${current.lastDeployLog ?? ""}\nRedeploy requested...`.trim(),
    }));
    const response = await fetch(`/api/hosting/${account.id}/deploy`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setRedeploying(false);
      setActionError(data.error ?? "Could not start redeploy.");
      return;
    }
    if (data.account) setAccount((current) => ({ ...current, ...data.account }));
    router.refresh();
  }

  async function deleteProject() {
    if (confirmation !== "DELETE") return;
    setDeleting(true);
    setActionError("");
    const response = await fetch(`/api/hosting/${account.id}/delete`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setActionError(data.error ?? "Could not delete this project.");
      setDeleting(false);
      return;
    }
    setDeleteOpen(false);
    router.push("/sites");
    router.refresh();
  }

  const headline =
    account.deployStatus === "LIVE"
      ? "Your site is live"
      : account.deployStatus === "BUILDING"
        ? "Deploying your project"
        : account.deployStatus === "FAILED"
          ? "Deployment needs attention"
          : "Deployment preview";

  const canRedeploy = account.deployStatus !== "BUILDING" && !redeploying;

  return (
    <section className="deploy-stage">
      <div className="deploy-stage-top">
        <a
          href={account.previewUrl}
          target="_blank"
          rel="noreferrer"
          className="deploy-stage-preview group"
          aria-label={`Open preview for ${account.previewUrl}`}
        >
          {account.deployStatus === "LIVE" && account.previewUrl ? (
            <iframe
              title="Deployed site preview"
              src={account.runtimeMode === "server" ? account.previewUrl : `/p/${account.previewSlug}/site`}
              sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
            />
          ) : (
            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/75">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Preview</span>
              {account.deployStatus === "BUILDING"
                ? "Build in progress — preview unlocks when the runtime is healthy."
                : "Preview will appear here after a successful deploy."}
            </div>
          )}
          <span className="absolute bottom-3 right-3 rounded-full bg-[rgba(8,17,31,0.82)] px-3 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
            Open site <ExternalLink className="ml-1 inline h-3 w-3" />
          </span>
        </a>

        <div className="deploy-stage-meta">
          <p className="page-kicker">Deployment</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--navy)]">{headline}</h2>
            <StatusBadge status={account.deployStatus} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            {account.framework ?? "Detected framework"}
            {account.runtimeMode === "server" ? " · SSR / API runtime" : " · Static output"}
            {account.buildCommand ? ` · ${account.buildCommand}` : ""}
          </p>
          <div className="deploy-stage-url" title={account.previewUrl}>
            {account.previewUrl}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn btn-hot" disabled={!canRedeploy} onClick={() => void redeploy()}>
              <BusyLabel busy={redeploying || account.deployStatus === "BUILDING"} busyText="Redeploying">
                <RefreshCw className="h-4 w-4" />
                Redeploy
              </BusyLabel>
            </button>
            {account.deployStatus === "LIVE" ? (
              <a href={account.previewUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                <ExternalLink className="h-4 w-4" />
                Open preview
              </a>
            ) : null}
            {account.domainName ? (
              <span className="btn btn-ghost pointer-events-none">
                <Globe2 className="h-4 w-4" />
                {account.domainName}
              </span>
            ) : account.hasDomains ? (
              <a href="#connect-domain" className="btn btn-ghost">
                Connect domain
              </a>
            ) : (
              <a href="/search" className="btn btn-ghost">
                Buy a domain
              </a>
            )}
          </div>
          {account.deployStatus === "FAILED" ? (
            <p className="text-sm text-[var(--danger)]">
              Build failed. Fix the issue (network, env vars, app code), then click Redeploy.
            </p>
          ) : null}
        </div>
      </div>

      <div className="deploy-stage-foot">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Custom domain</p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--navy)]">
            {account.domainName ?? "Point a domain here when you are ready to go public"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-[var(--danger)]"
          disabled={deleting || account.deployStatus === "BUILDING"}
          onClick={() => {
            setConfirmation("");
            setActionError("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete project
        </button>
      </div>

      {actionError ? <p className="border-t border-[var(--line)] px-5 py-3 text-sm text-[var(--danger)]">{actionError}</p> : null}

      {account.lastDeployLog ? (
        <div className="deploy-stage-log">
          <DeployLogConsole log={account.lastDeployLog} status={account.deployStatus} title="Build output" />
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,17,31,0.58)] px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeleteOpen(false);
          }}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deployed-project-delete-title"
            aria-describedby="deployed-project-delete-description"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(196,65,58,0.12)] text-[var(--danger)]">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="deployed-project-delete-title" className="text-lg font-extrabold text-[var(--navy)]">
                    Delete deployed project?
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                    {account.githubRepo ?? "This project"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost p-2"
                aria-label="Close delete confirmation"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p id="deployed-project-delete-description" className="mt-5 text-sm leading-6 text-[var(--muted)]">
              This permanently removes the deployed project, preview URL, deployment history, environment variables, and stored build files. This cannot be undone.
            </p>
            <label className="field mt-5">
              <span>
                Type <strong className="text-[var(--navy)]">DELETE</strong> to confirm
              </span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoFocus
                disabled={deleting}
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteOpen(false)}>
                Keep project
              </button>
              <button
                type="button"
                className="btn btn-hot"
                disabled={deleting || confirmation !== "DELETE"}
                onClick={() => void deleteProject()}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
