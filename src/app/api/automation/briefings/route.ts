import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  generateExecutiveBriefing,
  listExecutiveBriefings,
} from "@/lib/automation";
import { canManageAutomation } from "@/lib/automation/permissions";
import {
  listWorkspaceWebsites,
  resolveFocusWebsite,
} from "@/lib/websites/workspace";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const websiteId = new URL(req.url).searchParams.get("website");
    const sites = await listWorkspaceWebsites(ctx.workspace.id);
    const focus = resolveFocusWebsite(sites, websiteId);
    const briefings = await listExecutiveBriefings(ctx.workspace.id, {
      websiteId: focus?.id ?? websiteId,
    });
    return Response.json({
      websites: sites,
      focusWebsite: focus
        ? { id: focus.id, name: focus.name, domain: focus.domain }
        : null,
      briefings: briefings.map((b) => ({
        id: b.id,
        periodStart: b.periodStart.toISOString(),
        periodEnd: b.periodEnd.toISOString(),
        payload: b.payload,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Could not load briefings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageAutomation(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    let websiteId: string | null =
      new URL(req.url).searchParams.get("website");
    try {
      const body = (await req.json()) as { websiteId?: string };
      if (body.websiteId) websiteId = body.websiteId;
    } catch {
      /* empty ok */
    }
    const briefing = await generateExecutiveBriefing(
      ctx.workspace.id,
      websiteId,
    );
    const sites = await listWorkspaceWebsites(ctx.workspace.id);
    const focus = resolveFocusWebsite(sites, websiteId);
    return Response.json({
      briefing,
      websites: sites,
      focusWebsite: focus
        ? { id: focus.id, name: focus.name, domain: focus.domain }
        : null,
    });
  } catch {
    return Response.json({ error: "Could not generate briefing" }, { status: 500 });
  }
}
