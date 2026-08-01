import { db } from "@/db";
import { copilotPlans, type CopilotPlanPayload } from "@/db/schema";
import { generateExecutiveBriefing } from "@/lib/automation/briefing";
import { loadCopilotContext } from "@/lib/copilot/context";

export type ReportKind = "weekly_report" | "monthly_report" | "client_report";

export async function generateCopilotReport(input: {
  workspaceId: string;
  userId: string;
  kind: ReportKind;
  clientId?: string | null;
  clientName?: string | null;
  websiteId?: string | null;
}) {
  const ctx = await loadCopilotContext({
    workspaceId: input.workspaceId,
    isAgency: Boolean(input.clientId || input.kind === "client_report"),
    websiteId: input.websiteId,
  });

  let briefingSummary = "";
  try {
    const briefing = await generateExecutiveBriefing(
      input.workspaceId,
      input.websiteId,
    );
    briefingSummary = briefing.payload.progressSummary;
  } catch {
    briefingSummary =
      "Executive Briefing unavailable — composing from Copilot context only.";
  }

  const horizon =
    input.kind === "monthly_report"
      ? "30 days"
      : input.kind === "client_report"
        ? "client period"
        : "7 days";

  const title =
    input.kind === "monthly_report"
      ? "Monthly growth report"
      : input.kind === "client_report"
        ? `Client report${input.clientName ? `: ${input.clientName}` : ""}`
        : "Weekly growth summary";

  const payload: CopilotPlanPayload = {
    summary: `${briefingSummary} ${input.kind === "client_report" && input.clientName ? `Client focus: ${input.clientName}.` : ""} Draft for review — AI Estimate.`,
    priorities:
      ctx.priorities.map((p) => p.title).slice(0, 5).length > 0
        ? ctx.priorities.map((p) =>
            p.websiteDomain ? `${p.title} · ${p.websiteDomain}` : p.title,
          ).slice(0, 5)
        : ctx.openGaps.slice(0, 5).map((g) =>
            g.websiteDomain ? `${g.title} · ${g.websiteDomain}` : g.title,
          ),
    roadmap: [
      {
        title: "Highlights",
        horizon,
        steps: [
          `Queue depth: ${ctx.queueDepth}`,
          `Confidence: ${ctx.confidenceOverall ?? "n/a"}`,
          `Hub connections: ${ctx.hubConnected.length}`,
          ...(ctx.focusWebsite
            ? [`Website: ${ctx.focusWebsite.domain}`]
            : []),
        ],
      },
      {
        title: "Recommended next actions",
        horizon: "Next period",
        steps: ctx.openGaps.slice(0, 4).map((g) =>
          g.websiteDomain ? `${g.title} · ${g.websiteDomain}` : g.title,
        ) || [
          "Run analysis",
          "Add Business Memory facts",
        ],
      },
    ],
    estimatesLabeled: "AI Estimate",
    evidence: [
      briefingSummary.slice(0, 200),
      ...ctx.openGaps.slice(0, 3).map((g) =>
        g.websiteDomain ? `${g.title} · ${g.websiteDomain}` : g.title,
      ),
      ...ctx.notes.slice(0, 2),
    ],
    confidence: ctx.confidenceOverall ?? 50,
    fixPathHints: ["checklist", "action_assets"],
    websiteId: ctx.focusWebsite?.id ?? null,
    websiteName: ctx.focusWebsite?.name ?? null,
    websiteDomain: ctx.focusWebsite?.domain ?? null,
  };

  const [row] = await db
    .insert(copilotPlans)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      kind: input.kind,
      horizon,
      title,
      payload,
      status: "draft",
      clientId: input.clientId ?? null,
    })
    .returning();

  return row!;
}
