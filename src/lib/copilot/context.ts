import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  businessGoals,
  clients,
  moneyGapOpportunities,
  reports,
  workspaceConfidenceSnapshots,
} from "@/db/schema";
import { formatMemoryForPrompt, listMemoryEntries } from "@/lib/copilot/memory";
import { getTechProfile } from "@/lib/developer/memory";
import { listIntegrationsOverview } from "@/lib/integrations/connections";
import { getTodayPriorities } from "@/lib/growth-os/priority";
import { listQueueItems } from "@/lib/automation/queue";
import {
  listWorkspaceWebsites,
  resolveFocusWebsite,
  type WorkspaceWebsite,
} from "@/lib/websites/workspace";

export type CopilotWorkspaceContext = {
  notes: string[];
  memorySummary: string;
  priorities: {
    id: string;
    title: string;
    websiteId?: string | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  }[];
  openGaps: {
    id: string;
    title: string;
    category: string;
    moduleId: string | null;
    whatsMissing: string;
    difficulty: string | null;
    opportunityIndex: number | null;
    reportId: string;
    websiteId: string | null;
    websiteName: string | null;
    websiteDomain: string | null;
  }[];
  goals: { title: string; status: string }[];
  hubConnected: string[];
  stackSummary: string | null;
  confidenceOverall: number | null;
  queueDepth: number;
  isAgency: boolean;
  clientNames: string[];
  websites: WorkspaceWebsite[];
  focusWebsite: { id: string; name: string; domain: string } | null;
};

export async function loadCopilotContext(input: {
  workspaceId: string;
  isAgency?: boolean;
  websiteId?: string | null;
}): Promise<CopilotWorkspaceContext> {
  const notes: string[] = [];
  const sites = await listWorkspaceWebsites(input.workspaceId);
  const focus = resolveFocusWebsite(sites, input.websiteId);
  const focusId = focus?.id ?? null;

  let memorySummary = "(no Business Memory entries yet)";
  try {
    const entries = await listMemoryEntries(input.workspaceId);
    memorySummary = formatMemoryForPrompt(entries);
    if (!entries.length) notes.push("Business Memory empty — ask the founder key facts.");
  } catch {
    notes.push("Business Memory unavailable (soft-fail).");
  }

  let priorities: CopilotWorkspaceContext["priorities"] = [];
  try {
    priorities = (await getTodayPriorities(input.workspaceId, 10))
      .filter((p) => !focusId || p.websiteId === focusId)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        websiteId: p.websiteId,
        websiteName: p.websiteName,
        websiteDomain: p.websiteDomain,
      }));
  } catch {
    notes.push("Growth OS priorities unavailable.");
  }

  let openGaps: CopilotWorkspaceContext["openGaps"] = [];
  try {
    const workspaceReports = await db.query.reports.findMany({
      where: focusId
        ? and(
            eq(reports.workspaceId, input.workspaceId),
            eq(reports.websiteId, focusId),
          )
        : eq(reports.workspaceId, input.workspaceId),
      with: {
        website: { columns: { id: true, name: true, domain: true } },
      },
      orderBy: [desc(reports.createdAt)],
      limit: 20,
    });
    const reportIds = workspaceReports.map((r) => r.id);
    const reportSite = new Map(
      workspaceReports.map((r) => [
        r.id,
        {
          websiteId: r.websiteId as string | null,
          websiteName: r.website?.name ?? null,
          websiteDomain: r.website?.domain ?? null,
        },
      ]),
    );
    if (reportIds.length) {
      const opps = await db.query.moneyGapOpportunities.findMany({
        where: inArray(moneyGapOpportunities.reportId, reportIds),
        orderBy: [desc(moneyGapOpportunities.createdAt)],
        limit: 60,
      });
      openGaps = opps
        .filter((o) => o.implementationStatus === "open")
        .sort(
          (a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0),
        )
        .slice(0, 12)
        .map((o) => {
          const site = reportSite.get(o.reportId);
          return {
            id: o.id,
            title: o.title,
            category: o.category,
            moduleId: o.moduleId,
            whatsMissing: o.whatsMissing,
            difficulty: o.difficulty,
            opportunityIndex: o.opportunityIndex,
            reportId: o.reportId,
            websiteId: site?.websiteId ?? null,
            websiteName: site?.websiteName ?? null,
            websiteDomain: site?.websiteDomain ?? null,
          };
        });
    } else {
      notes.push("No reports yet — guidance will be more general.");
    }
  } catch {
    notes.push("Opportunity load soft-failed.");
  }

  let goals: CopilotWorkspaceContext["goals"] = [];
  try {
    const rows = await db.query.businessGoals.findMany({
      where: eq(businessGoals.workspaceId, input.workspaceId),
      limit: 12,
    });
    goals = rows.map((g) => ({ title: g.title, status: g.status }));
  } catch {
    notes.push("Goals unavailable.");
  }

  let hubConnected: string[] = [];
  try {
    const hub = await listIntegrationsOverview(input.workspaceId);
    hubConnected = hub.providers
      .filter((p) => p.connection?.status === "connected")
      .map((p) => p.slug);
    if (!hubConnected.length) notes.push("Integration Hub has no active connections.");
  } catch {
    notes.push("Integration Hub soft-failed.");
  }

  let stackSummary: string | null = null;
  try {
    const tech = await getTechProfile(input.workspaceId);
    if (tech?.stack) {
      const s = tech.stack as Record<string, unknown>;
      stackSummary = [
        s.frontend,
        s.backend,
        s.database,
        s.auth,
        s.hosting,
      ]
        .filter(Boolean)
        .join(" / ");
      if (!stackSummary) notes.push("Project Memory present but stack sparse.");
    } else {
      notes.push("Project Memory™ empty — Developer Mode path still available.");
    }
  } catch {
    notes.push("Project Memory soft-failed.");
  }

  let confidenceOverall: number | null = null;
  try {
    const snap = await db.query.workspaceConfidenceSnapshots.findFirst({
      where: eq(workspaceConfidenceSnapshots.workspaceId, input.workspaceId),
      orderBy: [desc(workspaceConfidenceSnapshots.createdAt)],
    });
    confidenceOverall = snap?.overallScore ?? null;
    if (confidenceOverall == null) notes.push("No Confidence snapshot yet.");
  } catch {
    notes.push("Confidence Engine soft-failed.");
  }

  let queueDepth = 0;
  try {
    const queue = await listQueueItems(input.workspaceId);
    queueDepth = queue.length;
  } catch {
    notes.push("Automation queue soft-failed.");
  }

  let clientNames: string[] = [];
  const isAgency = Boolean(input.isAgency);
  if (isAgency) {
    try {
      const rows = await db.query.clients.findMany({
        where: eq(clients.workspaceId, input.workspaceId),
        limit: 20,
      });
      clientNames = rows.map((c) => c.name);
      if (!clientNames.length) notes.push("Agency mode: no clients yet — soft-empty portfolio.");
    } catch {
      notes.push("Clients soft-failed.");
    }
  }

  if (focus) {
    notes.unshift(`Focus website: ${focus.name} (${focus.domain}).`);
  }

  return {
    notes,
    memorySummary,
    priorities,
    openGaps,
    goals,
    hubConnected,
    stackSummary,
    confidenceOverall,
    queueDepth,
    isAgency,
    clientNames,
    websites: sites,
    focusWebsite: focus
      ? { id: focus.id, name: focus.name, domain: focus.domain }
      : null,
  };
}

export function formatCopilotContextForPrompt(ctx: CopilotWorkspaceContext): string {
  const gaps = ctx.openGaps
    .map((g) => {
      const site = g.websiteDomain ? ` · ${g.websiteDomain}` : "";
      return `- ${g.title}${site} (OI ${g.opportunityIndex ?? "—"}, ${g.category}, module=${g.moduleId ?? "—"}) — ${g.whatsMissing.slice(0, 120)}`;
    })
    .join("\n");

  const focusLine = ctx.focusWebsite
    ? `FOCUS WEBSITE: ${ctx.focusWebsite.name} (${ctx.focusWebsite.domain})`
    : "FOCUS WEBSITE: (workspace-wide)";

  return `${focusLine}

BUSINESS MEMORY:
${ctx.memorySummary}

NOTES:
${ctx.notes.map((n) => `- ${n}`).join("\n") || "- (none)"}

GOALS:
${ctx.goals.map((g) => `- ${g.title} [${g.status}]`).join("\n") || "- (none)"}

TOP PRIORITIES:
${ctx.priorities
  .map(
    (p) =>
      `- ${p.title}${p.websiteDomain ? ` · ${p.websiteDomain}` : ""}`,
  )
  .join("\n") || "- (none)"}

OPEN HIGH-OI GAPS:
${gaps || "- (none)"}

INTEGRATION HUB CONNECTED: ${ctx.hubConnected.join(", ") || "(none)"}
PROJECT MEMORY / STACK: ${ctx.stackSummary || "(none)"}
CONFIDENCE OVERALL: ${ctx.confidenceOverall ?? "n/a"}
AUTOMATION QUEUE DEPTH: ${ctx.queueDepth}
AGENCY: ${ctx.isAgency ? `yes — clients: ${ctx.clientNames.join(", ") || "(none)"}` : "no"}`;
}
