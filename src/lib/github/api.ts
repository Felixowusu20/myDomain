export class GithubError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type GithubJson = Record<string, unknown> | unknown[] | null;

export async function githubRequest<T = GithubJson>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "myDomain",
      ...init?.headers,
    },
  });
  if (response.status === 204) return null as T;
  const data = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GithubError("Reconnect GitHub to continue.", response.status);
    }
    if (response.status === 404) {
      throw new GithubError("That repository is not accessible with this GitHub account.", 404);
    }
    throw new GithubError(data?.message ?? "GitHub request failed.", response.status >= 500 ? 502 : response.status);
  }
  return data as T;
}

export type GithubProfile = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

export type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  language: string | null;
  updated_at: string;
  pushed_at: string | null;
  size: number;
  owner: { login: string; avatar_url: string };
};

export type GithubBranch = {
  name: string;
  protected: boolean;
};

export type GithubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  encoding?: string;
  content?: string;
};

export async function githubUser(token: string) {
  return githubRequest<GithubProfile>(token, "/user");
}

export async function githubEmails(token: string) {
  return githubRequest<GithubEmail[]>(token, "/user/emails");
}

export async function githubRepos(token: string, page = 1, perPage = 30) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    sort: "updated",
    affiliation: "owner,collaborator,organization_member",
  });
  return githubRequest<GithubRepo[]>(token, `/user/repos?${query}`);
}

export async function githubRepo(token: string, owner: string, repo: string) {
  return githubRequest<GithubRepo>(token, `/repos/${owner}/${repo}`);
}

export async function githubBranches(token: string, owner: string, repo: string) {
  return githubRequest<GithubBranch[]>(token, `/repos/${owner}/${repo}/branches?per_page=100`);
}

export async function githubContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
) {
  const query = new URLSearchParams({ ref });
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return githubRequest<GithubContentItem | GithubContentItem[]>(
    token,
    `/repos/${owner}/${repo}/contents${suffix}?${query}`,
  );
}

export async function githubArchive(token: string, owner: string, repo: string, ref: string) {
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tarball/${encodeURIComponent(ref)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "myDomain",
      },
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new GithubError("Reconnect GitHub to continue.", response.status);
    if (response.status === 404) throw new GithubError("That repository is not accessible with this GitHub account.", 404);
    throw new GithubError("Could not download the repository source.", response.status >= 500 ? 502 : response.status);
  }
  return Buffer.from(await response.arrayBuffer());
}

export function decodeGithubFile(item: GithubContentItem | GithubContentItem[] | null) {
  if (!item || Array.isArray(item) || !item.content) return "";
  return Buffer.from(item.content.replaceAll("\n", ""), item.encoding === "base64" ? "base64" : "utf8").toString("utf8");
}

export async function exchangeGithubCode(code: string) {
  const { githubClientId, githubClientSecret, githubCallbackUrl } = await import("@/lib/github/config");
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: githubClientId(),
      client_secret: githubClientSecret(),
      code,
      redirect_uri: githubCallbackUrl(),
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new GithubError(data.error_description ?? "GitHub sign-in was cancelled.", 400);
  }
  return { accessToken: data.access_token, scope: data.scope ?? "" };
}

export function pickGithubEmail(emails: GithubEmail[], profileEmail: string | null) {
  const verified = emails.filter((row) => row.verified);
  const primary = verified.find((row) => row.primary);
  const fallback = verified[0];
  const fromProfile = verified.find((row) => row.email === profileEmail);
  return (primary ?? fromProfile ?? fallback)?.email ?? null;
}
