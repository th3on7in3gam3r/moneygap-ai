import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getIdePromptPayload } from "@/lib/developer/ide-prompt";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const opportunityId = new URL(req.url).searchParams.get("opportunityId")?.trim();
  if (!opportunityId) {
    return Response.json({ error: "opportunityId required" }, { status: 400 });
  }

  try {
    const ctx = await loadAgencyContext();
    const payload = await getIdePromptPayload({
      workspaceId: ctx.workspace.id,
      opportunityId,
    });

    if (!payload.ok) {
      const status = payload.error === "Forbidden" ? 403 : 404;
      return Response.json({ error: payload.error }, { status });
    }

    return Response.json({
      opportunity: payload.opportunity,
      website: payload.website,
      prompts: payload.prompts,
      stackSummary: payload.stackSummary,
      hasStack: payload.hasStack,
    });
  } catch {
    return Response.json({ error: "Could not load IDE prompts" }, { status: 500 });
  }
}
