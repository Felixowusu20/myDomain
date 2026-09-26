"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Github, Lock } from "lucide-react";
import { GithubAuthButton } from "@/components/github-auth-button";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Repo = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  updatedAt: string;
  fork: boolean;
  owner: string;
  avatarUrl: string;
};

export function GithubRepoPicker({
  connected,
  configured,
  login,
  avatarUrl,
}: {
  connected: boolean;
  configured: boolean;
  login: string | null;
  avatarUrl: string | null;
}) {
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(connected);
  const [error, setError] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    return `/api/github/repos?${params}`;
  }, [query]);

  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(endpoint)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            setRepos([]);
            return;
          }
          setError("");
          setRepos(data.repos ?? []);
        })
        .catch(() => setError("Could not load GitHub repositories."))
        .finally(() => setLoading(false));
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [connected, endpoint, query]);

  if (!configured) {
    return (
      <div className="card p-6">
        <EmptyState
          icon={Github}
          title="GitHub is not connected on this platform"
          body="Add a GitHub OAuth app, then customers can sign in and import repositories like Vercel."
        />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="stat-icon">
            <Github className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold text-[var(--navy)]">Import a GitHub repository</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Connect GitHub to see your projects, pick a repo, and run the same kind of deploy checks Vercel does before preview hosting goes live.
            </p>
          </div>
        </div>
        <GithubAuthButton intent="connect" next="/sites" />
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full" />
          ) : (
            <Github className="h-5 w-5" />
          )}
          <div>
            <p className="font-bold text-[var(--navy)]">{login}</p>
            <p className="text-xs text-[var(--muted)]">GitHub connected</p>
          </div>
        </div>
        <Link href="/account" className="text-sm font-semibold text-[var(--accent)]">
          Manage
        </Link>
      </div>
      <label className="field">
        <span>Search repositories</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your GitHub repos"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading repositories…</p> : null}
      {!loading && !repos.length ? (
        <p className="text-sm text-[var(--muted)]">No repositories matched that search.</p>
      ) : (
        <div className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
          {repos.map((repo) => (
            <div key={repo.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {repo.fullName}
                  {repo.private ? <Lock className="h-3.5 w-3.5 text-[var(--muted)]" /> : null}
                </p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {repo.language ?? "No language"} · Updated {formatDate(repo.updatedAt)}
                  {repo.description ? ` · ${repo.description}` : ""}
                </p>
              </div>
              <Link href={`/sites/import?repo=${encodeURIComponent(repo.fullName)}`} className="btn btn-primary">
                Import
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
