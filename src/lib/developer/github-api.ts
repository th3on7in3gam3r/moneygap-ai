import { getProviderCredentials } from "@/lib/integrations";

const UA = "MoneyGap-Developer-Mode";

export class DeveloperGithubError extends Error {
  constructor(
    message: string,
    public status: number = 502,
  ) {
    super(message);
    this.name = "DeveloperGithubError";
  }
}

export async function getGithubAccessToken(workspaceId: string): Promise<string | null> {
  const pack = await getProviderCredentials(workspaceId, "github");
  return pack?.credentials.accessToken ?? null;
}

async function githubFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": UA,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DeveloperGithubError(
      `GitHub API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      res.status >= 400 && res.status < 500 ? res.status : 502,
    );
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export type GithubRepoSummary = {
  full_name: string;
  default_branch: string;
  html_url: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
};

export async function listGithubRepos(token: string): Promise<GithubRepoSummary[]> {
  const out: GithubRepoSummary[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await githubFetch<GithubRepoSummary[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

export async function fetchGithubFileContent(
  token: string,
  fullName: string,
  path: string,
  ref?: string,
): Promise<string | null> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  try {
    const data = await githubFetch<{
      encoding?: string;
      content?: string;
      type?: string;
    }>(token, `/repos/${fullName}/contents/${path}${q}`);
    if (data.type !== "file" || !data.content) return null;
    if (data.encoding === "base64") {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    }
    return data.content;
  } catch (e) {
    if (e instanceof DeveloperGithubError && e.status === 404) return null;
    throw e;
  }
}

export async function getBranchSha(
  token: string,
  fullName: string,
  branch: string,
): Promise<string> {
  const data = await githubFetch<{ object: { sha: string } }>(
    token,
    `/repos/${fullName}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  return data.object.sha;
}

export async function createBranch(
  token: string,
  fullName: string,
  branchName: string,
  fromSha: string,
): Promise<void> {
  await githubFetch(token, `/repos/${fullName}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    }),
  });
}

export async function createOrUpdateFile(
  token: string,
  fullName: string,
  path: string,
  content: string,
  message: string,
  branch: string,
): Promise<void> {
  let sha: string | undefined;
  try {
    const existing = await githubFetch<{ sha: string }>(
      token,
      `/repos/${fullName}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    );
    sha = existing.sha;
  } catch {
    /* new file */
  }
  await githubFetch(token, `/repos/${fullName}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function createPullRequest(
  token: string,
  fullName: string,
  input: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  },
): Promise<{ html_url: string; number: number }> {
  const data = await githubFetch<{ html_url: string; number: number }>(
    token,
    `/repos/${fullName}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        draft: input.draft ?? true,
      }),
    },
  );
  return { html_url: data.html_url, number: data.number };
}
