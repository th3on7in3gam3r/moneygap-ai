import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { copilotThreads } from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  getThreadMessages,
  isGrowthCopilotEnabled,
  runCopilotChat,
} from "@/lib/copilot";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ enabled: false, messages: [] });
  }

  try {
    const { id } = await context.params;
    const ctx = await loadAgencyContext();
    const thread = await db.query.copilotThreads.findFirst({
      where: eq(copilotThreads.id, id),
    });
    if (!thread || thread.workspaceId !== ctx.workspace.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const messages = await getThreadMessages(id);
    return Response.json({ enabled: true, thread, messages });
  } catch {
    return Response.json({ error: "Could not load messages" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthCopilotEnabled()) {
    return Response.json({ error: "Growth Copilot disabled" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const ctx = await loadAgencyContext();

    const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
      "@/lib/billing"
    );
    const gate = await requireFeatureAndUsage({
      workspaceId: ctx.workspace.id,
      feature: "ai_advisor",
      usageType: "ai_generation",
    });
    if (!gate.ok) return upgradeResponse(gate);

    const body = (await req.json()) as { message?: string; websiteId?: string };
    const message = body.message?.trim();
    if (!message) {
      return Response.json({ error: "message required" }, { status: 400 });
    }

    const result = await runCopilotChat({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      threadId: id,
      message,
      isAgency: ctx.isAgency,
      websiteId: body.websiteId,
    });

    await recordUsage({
      workspaceId: ctx.workspace.id,
      type: "ai_generation",
      meta: { kind: "growth_copilot", threadId: id },
    });

    return Response.json(result);
  } catch (err) {
    console.error("copilot chat:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Copilot failed" },
      { status: 500 },
    );
  }
}
