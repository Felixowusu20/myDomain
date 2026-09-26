"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Github } from "lucide-react";
import { BusyLabel } from "@/components/spinner";
import { EnvVarsEditor, type EnvVarRow } from "@/components/env-vars-editor";

export function GithubDeployForm() {
  const router = useRouter();
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/hosting/trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        githubRepo,
        githubBranch,
        envVars: envVars.filter((row) => row.key.trim()),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not deploy");
      return;
    }
    router.push(`/hosting/${data.account.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <label className="field">
        <span>GitHub repository</span>
        <input
          value={githubRepo}
          onChange={(event) => setGithubRepo(event.target.value)}
          placeholder="owner/repo or github.com/owner/repo"
          required
        />
      </label>
      <label className="field">
        <span>Branch</span>
        <input
          value={githubBranch}
          onChange={(event) => setGithubBranch(event.target.value)}
          placeholder="main"
        />
      </label>
      <EnvVarsEditor value={envVars} onChange={setEnvVars} />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-hot" disabled={loading}>
        <BusyLabel busy={loading} busyText="Deploying">
          <Github className="h-4 w-4" />
          Deploy preview
        </BusyLabel>
      </button>
      <p className="text-xs text-[var(--muted)]">
        You get 14 days of dummy preview hosting. After that, buy a plan and connect your domain to keep the site live.
      </p>
    </form>
  );
}
