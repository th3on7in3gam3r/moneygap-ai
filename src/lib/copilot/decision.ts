import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  decisionSimulations,
  type DecisionSimulationResult,
} from "@/db/schema";
import { loadCopilotContext } from "@/lib/copilot/context";
import { hintFixPathForText } from "@/lib/copilot/fix-path-hints";

function scoreOption(
  label: string,
  description: string | undefined,
  ctx: Awaited<ReturnType<typeof loadCopilotContext>>,
): { score: number; notes: string } {
  const blob = `${label} ${description ?? ""}`.toLowerCase();
  let score = 50;
  const notes: string[] = [];

  if (/automat|workflow|zapier|nurture/.test(blob)) {
    score += ctx.queueDepth > 0 ? 12 : 6;
    notes.push("Automation-shaped; draft workflows only.");
  }
  if (/hir(e|ing)|headcount|agency retainer|contractor/.test(blob)) {
    score += ctx.goals.length ? 8 : 4;
    notes.push("Hiring adds capacity; compare to automation cost.");
  }
  if (/market|ads|content|seo|campaign|email/.test(blob)) {
    score += ctx.openGaps.some((g) =>
      /marketing|trust|seo|content/i.test(g.moduleId ?? g.category),
    )
      ? 14
      : 6;
    notes.push("Aligns with marketing/trust gaps when present.");
  }
  if (/develop|engineer|feature|code|schema|auth|api/.test(blob)) {
    score += ctx.stackSummary ? 12 : 5;
    notes.push(
      ctx.stackSummary
        ? "Project Memory available for Dev Mode."
        : "Stack unknown — still soft-offer Developer Mode.",
    );
  }
  if (ctx.confidenceOverall != null && ctx.confidenceOverall < 55) {
    score -= 5;
    notes.push("Lower Confidence snapshot — prefer reversible drafts.");
  }

  return {
    score: Math.max(5, Math.min(95, score)),
    notes: notes.join(" ") || "Context-weighted heuristic.",
  };
}

export async function runDecisionSimulation(input: {
  workspaceId: string;
  userId: string;
  title: string;
  options: { label: string; description?: string }[];
  criteria?: string[];
  websiteId?: string | null;
}) {
  if (input.options.length < 2) {
    throw new Error("Provide at least two options to compare.");
  }

  const ctx = await loadCopilotContext({
    workspaceId: input.workspaceId,
    websiteId: input.websiteId,
  });
  const scored = input.options.map((o) => {
    const s = scoreOption(o.label, o.description, ctx);
    return { label: o.label, score: s.score, notes: s.notes };
  });
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!;

  const topGap = ctx.openGaps[0];
  const hint = hintFixPathForText({
    title: topGap?.title ?? winner.label,
    category: topGap?.category ?? "Growth",
    moduleId: topGap?.moduleId,
    whatsMissing: topGap?.whatsMissing ?? winner.label,
    difficulty: topGap?.difficulty,
  });

  const result: DecisionSimulationResult = {
    scores: scored,
    recommendation: `Lean toward “${winner.label}” given current gaps and capacity signals (AI Estimate). Confirm with evidence below before committing. Outbound actions require approval — use Fix Paths.`,
    evidence: [
      ...ctx.openGaps.slice(0, 3).map((g) =>
        g.websiteDomain
          ? `Gap: ${g.title} · ${g.websiteDomain}`
          : `Gap: ${g.title}`,
      ),
      ...ctx.goals.slice(0, 2).map((g) => `Goal: ${g.title}`),
      ...(ctx.stackSummary ? [`Stack: ${ctx.stackSummary}`] : []),
      ...ctx.notes.slice(0, 2),
    ],
    confidence: Math.round(
      scored.reduce((a, b) => a + b.score, 0) / scored.length,
    ),
    fixPathId: hint.recommendedId,
    requiresApproval: true,
    websiteId: ctx.focusWebsite?.id ?? null,
    websiteName: ctx.focusWebsite?.name ?? null,
    websiteDomain: ctx.focusWebsite?.domain ?? null,
  };

  const [row] = await db
    .insert(decisionSimulations)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title.trim() || "Decision comparison",
      options: input.options,
      criteria: input.criteria ?? [],
      result,
      status: "draft",
    })
    .returning();

  return row!;
}

export async function listDecisionSimulations(workspaceId: string, limit = 15) {
  try {
    return await db.query.decisionSimulations.findMany({
      where: eq(decisionSimulations.workspaceId, workspaceId),
      orderBy: [desc(decisionSimulations.createdAt)],
      limit,
    });
  } catch {
    return [];
  }
}

export async function approveDecisionSimulation(input: {
  workspaceId: string;
  id: string;
}) {
  const [row] = await db
    .update(decisionSimulations)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(decisionSimulations.id, input.id))
    .returning();
  if (!row || row.workspaceId !== input.workspaceId) return null;
  return row;
}
