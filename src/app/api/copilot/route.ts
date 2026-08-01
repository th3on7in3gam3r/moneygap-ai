import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  isGrowthCopilotEnabled,
  listCopilotThreads,
  listMemoryEntries,
  COPILOT_MODES,
  loadCopilotContext,
} from "@/lib/copilot";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGrowthCopilotEnabled()) {
    return Response.json({
      enabled: false,
      message: "Growth Copilot™ is disabled (FEATURE_GROWTH_COPILOT).",
      modes: COPILOT_MODES,
      memoryCount: 0,
      threads: [],
      context: null,
      websites: [],
      focusWebsite: null,
    });
  }

  try {
    const ctx = await loadAgencyContext();
    const websiteId = new URL(req.url).searchParams.get("website");
    const [memory, threads, context] = await Promise.all([
      listMemoryEntries(ctx.workspace.id, 5),
      listCopilotThreads(ctx.workspace.id, 10),
      loadCopilotContext({
        workspaceId: ctx.workspace.id,
        isAgency: ctx.isAgency,
        websiteId,
      }),
    ]);

    return Response.json({
      enabled: true,
      message: null,
      modes: COPILOT_MODES,
      memoryCount: memory.length,
      threads: threads.map((t) => ({
        id: t.id,
        title: t.title,
        mode: t.mode,
        updatedAt: t.updatedAt,
      })),
      websites: context.websites,
      focusWebsite: context.focusWebsite,
      context: {
        notes: context.notes,
        openGapCount: context.openGaps.length,
        confidenceOverall: context.confidenceOverall,
        queueDepth: context.queueDepth,
        hubConnected: context.hubConnected,
        stackSummary: context.stackSummary,
        isAgency: context.isAgency,
        focusDomain: context.focusWebsite?.domain ?? null,
      },
    });
  } catch {
    return Response.json({ error: "Could not load Growth Copilot" }, { status: 500 });
  }
}
