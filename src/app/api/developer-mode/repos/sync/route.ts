import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { canManageDeveloperMode, syncGithubRepos } from "@/lib/developer";

export async function POST() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await syncGithubRepos({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
    });
    if (!result.ok) {
      return Response.json(
        { error: result.error, hubPath: "/dashboard/integrations" },
        { status: result.status },
      );
    }
    return Response.json({
      repos: result.repos.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        htmlUrl: r.htmlUrl,
        isPrimary: r.isPrimary,
        status: r.status,
      })),
    });
  } catch {
    return Response.json({ error: "Could not sync repositories" }, { status: 500 });
  }
}
