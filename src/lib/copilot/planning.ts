import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { copilotPlans, type CopilotPlanPayload } from "@/db/schema";
import { loadCopilotContext } from "@/lib/copilot/context";
import { hintFixPathForText } from "@/lib/copilot/fix-path-hints";

export type PlanKind = "growth" | "priority" | "quarterly" | "roadmap";

export async function generateCopilotPlan(input: {
  workspaceId: string;
  userId: string;
  kind: PlanKind;
  horizon?: string | null;
  websiteId?: string | null;
}) {
  const ctx = await loadCopilotContext({
    workspaceId: input.workspaceId,
    websiteId: input.websiteId,
  });
  const top = ctx.openGaps.slice(0, 5);
  const hint = hintFixPathForText({
    title: top[0]?.title,
    category: top[0]?.category,
    moduleId: top[0]?.moduleId,
    whatsMissing: top[0]?.whatsMissing,
    difficulty: top[0]?.difficulty,
  });

  const horizon =
    input.horizon ??
    (input.kind === "quarterly" ? "90 days" : input.kind === "roadmap" ? "6 months" : "30 days");

  const payload: CopilotPlanPayload = {
    summary:
      input.kind === "quarterly"
        ? `Quarterly focus: close ${Math.min(3, top.length) || 1} highest-OI gaps while protecting score. AI Estimate.`
        : input.kind === "priority"
          ? `Priority stack from Growth OS + open opportunities. AI Estimate.`
          : input.kind === "roadmap"
            ? `Implementation roadmap across marketing, product, and engineering Fix Paths. AI Estimate.`
            : `Growth plan grounded in open Money Gaps and goals. AI Estimate.`,
    priorities:
      top.map((g) => g.title).length > 0
        ? top.map((g) =>
            g.websiteDomain ? `${g.title} · ${g.websiteDomain}` : g.title,
          )
        : ctx.priorities.map((p) =>
            p.websiteDomain ? `${p.title} · ${p.websiteDomain}` : p.title,
          ).slice(0, 5),
    roadmap: [
      {
        title: "Stabilize & measure",
        horizon: "Week 1–2",
        steps: [
          "Confirm Business Memory facts",
          "Review Confidence snapshot",
          "Sync Automation queue if enabled",
        ],
      },
      {
        title: "Close top gaps",
        horizon: horizon,
        steps: top.slice(0, 3).map((g) =>
          g.websiteDomain
            ? `Address: ${g.title} · ${g.websiteDomain}`
            : `Address: ${g.title}`,
        ) || [
          "Run a website analysis",
          "Set Growth OS goals",
        ],
      },
      {
        title: "Execute via Fix Paths",
        horizon: "Ongoing",
        steps: [
          `Recommended path: ${hint.recommendedId}`,
          "Review drafts — never auto-publish",
          "Mark opportunities complete in Action Center",
        ],
      },
    ],
    estimatesLabeled: "AI Estimate",
    evidence: [
      ...top.slice(0, 4).map((g) =>
        g.websiteDomain ? `${g.title} · ${g.websiteDomain}` : g.title,
      ),
      ...ctx.goals.slice(0, 2).map((g) => `Goal: ${g.title}`),
      ...ctx.notes.slice(0, 3),
    ],
    confidence: top[0]
      ? Math.min(90, 50 + Math.round((top[0].opportunityIndex ?? 40) / 3))
      : 45,
    fixPathHints: [hint.recommendedId],
    websiteId: ctx.focusWebsite?.id ?? null,
    websiteName: ctx.focusWebsite?.name ?? null,
    websiteDomain: ctx.focusWebsite?.domain ?? null,
  };

  const titles: Record<PlanKind, string> = {
    growth: "Growth plan",
    priority: "Priority recommendations",
    quarterly: "Quarterly strategy",
    roadmap: "Implementation roadmap",
  };

  const [row] = await db
    .insert(copilotPlans)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      kind: input.kind,
      horizon,
      title: titles[input.kind],
      payload,
      status: "draft",
    })
    .returning();

  return row!;
}

export async function listCopilotPlans(workspaceId: string, limit = 20) {
  try {
    return await db.query.copilotPlans.findMany({
      where: eq(copilotPlans.workspaceId, workspaceId),
      orderBy: [desc(copilotPlans.createdAt)],
      limit,
    });
  } catch {
    return [];
  }
}
