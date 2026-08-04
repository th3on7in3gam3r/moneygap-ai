/**
 * GitHub adapter — wraps Developer Mode github-api / repo-intel.
 * Does not rebuild OAuth; uses Integration Hub credentials.
 */
import {
  createBranch,
  createPullRequest,
  getGithubAccessToken,
} from "@/lib/developer/github-api";
import {
  baseRepoProviderHelpers,
  detectFrameworkFromManifests,
  type RepoProvider,
} from "@/lib/fixflow/git/provider";
import type { RepoContext } from "@/lib/fixflow/types";
import { assertCanCreateBranch } from "@/lib/fixflow/validators/safety";

export async function hasGithubAuth(workspaceId: string): Promise<boolean> {
  const token = await getGithubAccessToken(workspaceId);
  return !!token;
}

export function createGithubRepoProvider(): RepoProvider {
  return {
    id: "github",
    ...baseRepoProviderHelpers,
    getRepoContext(input): RepoContext {
      return {
        provider: "github",
        fullName: input.fullName ?? "",
        defaultBranch: input.defaultBranch ?? "main",
        framework: detectFrameworkFromManifests({
          packageJson: input.packageJson,
          configFiles: input.paths,
        }),
        structureHints: input.paths?.slice(0, 40) ?? [],
        dependencies: baseRepoProviderHelpers.readManifests({
          "package.json": input.packageJson ?? "",
        }).dependencies,
        connected: input.connected,
        message: input.message,
      };
    },
  };
}

/** Foundation wrappers — callers must pass authorize + safety validators first. */
export async function fixflowCreateBranch(input: {
  workspaceId: string;
  fullName: string;
  branch: string;
  fromSha: string;
}) {
  assertCanCreateBranch(input.branch);
  const token = await getGithubAccessToken(input.workspaceId);
  if (!token) throw new Error("GitHub is not connected for this workspace.");
  return createBranch(token, input.fullName, input.branch, input.fromSha);
}

export async function fixflowCreateDraftPullRequest(input: {
  workspaceId: string;
  fullName: string;
  title: string;
  body: string;
  head: string;
  base: string;
}) {
  assertCanCreateBranch(input.head);
  const token = await getGithubAccessToken(input.workspaceId);
  if (!token) throw new Error("GitHub is not connected for this workspace.");
  return createPullRequest(token, input.fullName, {
    title: input.title,
    body: input.body,
    head: input.head,
    base: input.base,
    draft: true,
  });
}
