import { db } from "@/db";
import {
  copilotMessages,
  moneyGapOpportunities,
  reports,
  type OnboardingPersonaRole,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createCopilotThread } from "@/lib/copilot/chat";
import { personaToCopilotMode } from "@/lib/onboarding/constants";
import { recommendFixPaths } from "@/lib/fix-paths/recommend";

export async function seedWelcomeCopilotMessage(input: {
  workspaceId: string;
  userId: string;
  personaRole?: OnboardingPersonaRole | null;
  companyName?: string | null;
  primaryGoals?: string[];
  reportId?: string | null;
}) {
  const mode = personaToCopilotMode(input.personaRole);
  const thread = await createCopilotThread({
    workspaceId: input.workspaceId,
    userId: input.userId,
    mode,
    title: "Welcome — first opportunities",
  });

  let topTitle = "your highest-impact opportunity";
  let scoreLine = "";
  let fixPathHint = "Action Center or checklist Fix Path™";

  if (input.reportId) {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, input.reportId),
    });
    if (report?.moneyGapScore != null) {
      scoreLine = ` Your MoneyGap Score™ is ${report.moneyGapScore}.`;
    }
    const gaps = await db.query.moneyGapOpportunities.findMany({
      where: eq(moneyGapOpportunities.reportId, input.reportId),
      orderBy: [desc(moneyGapOpportunities.opportunityIndex)],
      limit: 3,
    });
    const top = gaps[0];
    if (top) {
      topTitle = top.title;
      const rec = recommendFixPaths({
        id: top.id,
        title: top.title,
        category: top.category,
        moduleId: top.moduleId,
        whatsMissing: top.whatsMissing,
        difficulty: top.difficulty,
      });
      fixPathHint = rec.paths[0]?.title ?? fixPathHint;
    }
  }

  const company = input.companyName?.trim() || "your business";
  const goals =
    input.primaryGoals && input.primaryGoals.length
      ? ` Based on your goals, `
      : " ";

  const content = `Welcome! I analyzed ${company} and found several opportunities.${scoreLine}

${goals}I recommend starting with your highest-impact Fix Path™: **${topTitle}** via **${fixPathHint}**.

I'll continue monitoring your business and notify you when I discover new opportunities. Ask me anything about priorities, Fix Paths™, or what to ship next.`;

  await db.insert(copilotMessages).values({
    threadId: thread.id,
    role: "assistant",
    content,
    meta: {
      confidence: 70,
      citations: input.reportId ? [`report:${input.reportId}`] : [],
    },
  });

  return thread;
}

export async function getFirstResultsSummary(reportId: string) {
  const report = await db.query.reports.findFirst({
    where: eq(reports.id, reportId),
  });
  if (!report) return null;

  const gaps = await db.query.moneyGapOpportunities.findMany({
    where: eq(moneyGapOpportunities.reportId, reportId),
    orderBy: [desc(moneyGapOpportunities.opportunityIndex)],
    limit: 20,
  });

  const top = gaps[0] ?? null;
  const fix = top
    ? recommendFixPaths({
        id: top.id,
        title: top.title,
        category: top.category,
        moduleId: top.moduleId,
        whatsMissing: top.whatsMissing,
        difficulty: top.difficulty,
      })
    : null;

  const impact = top?.estimatedAnnualRevenue ?? null;
  const impactLow = impact != null ? Math.round(Number(impact) * 0.6) : null;
  const impactHigh = impact != null ? Math.round(Number(impact) * 1.4) : null;

  return {
    reportId: report.id,
    moneyGapScore: report.moneyGapScore,
    gapsFound: gaps.length,
    topOpportunity: top
      ? {
          id: top.id,
          title: top.title,
          category: top.category,
          confidence: top.confidence,
          estimatedImpact: impact,
          estimatedRange:
            impactLow != null && impactHigh != null
              ? { low: impactLow, high: impactHigh, label: "AI Estimate" as const }
              : null,
        }
      : null,
    primaryFixPath: fix
      ? {
          id: fix.recommendedId,
          title: fix.paths[0]?.title ?? fix.recommendedId,
          reason: fix.reason,
        }
      : null,
    recommendedNextStep: top
      ? `Open the report and start the ${fix?.paths[0]?.title ?? "recommended"} Fix Path™ for “${top.title}”.`
      : "Open your Growth Report and review Money Gaps.",
  };
}
