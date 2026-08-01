import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  competitorSnapshots,
  moneyGapOpportunities,
  reports,
  scoreSnapshots,
  websites,
} from "@/db/schema";
import { listIntegrationsOverview } from "@/lib/integrations/connections";
import type { PredictiveFeedContext } from "@/lib/predictive/types";
import { listWorkspaceWebsites } from "@/lib/websites/workspace";

/** @deprecated Prefer listWorkspaceWebsites — kept for Predictive callers */
export async function listPredictiveWebsites(workspaceId: string) {
  return listWorkspaceWebsites(workspaceId);
}

export async function loadPredictiveFeedContext(
  workspaceId: string,
  preferredWebsiteId?: string | null,
): Promise<PredictiveFeedContext> {
  const notes: string[] = [];
  let websiteId: string | null = null;
  let websiteName: string | null = null;
  let websiteDomain: string | null = null;
  let industrySlug: string | null = null;

  try {
    const sites = await db.query.websites.findMany({
      where: eq(websites.workspaceId, workspaceId),
      orderBy: [desc(websites.updatedAt)],
    });
    const preferred =
      (preferredWebsiteId &&
        sites.find((s) => s.id === preferredWebsiteId)) ||
      sites[0] ||
      null;
    if (preferred) {
      websiteId = preferred.id;
      websiteName = preferred.name;
      websiteDomain = preferred.domain;
    }
  } catch {
    notes.push("Website load soft-failed.");
  }

  const scores: PredictiveFeedContext["scores"] = [];
  if (websiteId) {
    try {
      const rows = await db.query.scoreSnapshots.findMany({
        where: eq(scoreSnapshots.websiteId, websiteId),
        orderBy: [desc(scoreSnapshots.createdAt)],
        limit: 12,
      });
      for (const r of rows) {
        scores.push({
          moneyGapScore: r.moneyGapScore,
          revenueAtRisk: r.revenueAtRisk,
          createdAt: r.createdAt,
        });
      }
    } catch {
      notes.push("Score snapshots soft-failed.");
    }
  } else {
    notes.push("No website yet — forecasts use opportunity signals only.");
  }

  const latestScore = scores[0]?.moneyGapScore ?? null;
  const scoreTrend =
    scores.length >= 2
      ? scores[0]!.moneyGapScore - scores[scores.length - 1]!.moneyGapScore
      : null;

  let openGaps: PredictiveFeedContext["openGaps"] = [];
  try {
    const reportWhere = websiteId
      ? and(
          eq(reports.workspaceId, workspaceId),
          eq(reports.websiteId, websiteId),
        )
      : eq(reports.workspaceId, workspaceId);

    const workspaceReports = await db.query.reports.findMany({
      where: reportWhere,
      orderBy: [desc(reports.createdAt)],
      limit: 15,
    });
    const reportIds = workspaceReports.map((r) => r.id);
    if (reportIds.length) {
      const opps = await db.query.moneyGapOpportunities.findMany({
        where: inArray(moneyGapOpportunities.reportId, reportIds),
        orderBy: [desc(moneyGapOpportunities.createdAt)],
        limit: 80,
      });
      openGaps = opps
        .filter((o) => o.implementationStatus === "open")
        .sort(
          (a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0),
        )
        .slice(0, 15)
        .map((o) => ({
          id: o.id,
          title: o.title,
          moduleId: o.moduleId,
          category: o.category,
          severity: o.severity,
          opportunityIndex: o.opportunityIndex,
          estimatedAnnualRevenue: o.estimatedAnnualRevenue,
          reportId: o.reportId,
        }));

      for (const o of opps) {
        const slug = (o.kgMeta as { industrySlug?: string } | null)?.industrySlug;
        if (slug) {
          industrySlug = slug;
          break;
        }
      }
    } else {
      notes.push("No reports — limited opportunity forecasting.");
    }
  } catch {
    notes.push("Opportunity load soft-failed.");
  }

  const competitorNotes: string[] = [];
  if (websiteId) {
    try {
      const snaps = await db.query.competitorSnapshots.findMany({
        where: eq(competitorSnapshots.websiteId, websiteId),
        orderBy: [desc(competitorSnapshots.createdAt)],
        limit: 8,
      });
      if (snaps.length < 2) {
        notes.push("Competitor snapshot history thin.");
      }
      const fingerprints = new Set(snaps.map((s) => s.fingerprint));
      if (fingerprints.size > 1) {
        competitorNotes.push(
          `${fingerprints.size} distinct competitor fingerprints across recent snapshots`,
        );
      }
      for (const s of snaps.slice(0, 4)) {
        const sig = s.signals;
        if (sig?.summary) competitorNotes.push(sig.summary);
        if (sig?.offers?.length) {
          competitorNotes.push(`Offers: ${sig.offers.slice(0, 2).join(", ")}`);
        }
        if (sig?.content?.length) {
          competitorNotes.push(`Content: ${sig.content.slice(0, 2).join(", ")}`);
        }
      }
    } catch {
      notes.push("Competitor snapshots soft-failed.");
    }
  }

  let hubConnectedCount = 0;
  try {
    const hub = await listIntegrationsOverview(workspaceId);
    hubConnectedCount = hub.providers.filter(
      (p) => p.connection?.status === "connected",
    ).length;
    if (!hubConnectedCount) notes.push("Integration Hub has no active connections.");
  } catch {
    notes.push("Integration Hub soft-failed.");
  }

  return {
    notes,
    websiteId,
    websiteName,
    websiteDomain,
    scores,
    latestScore,
    scoreTrend,
    openGaps,
    competitorNotes,
    industrySlug,
    hubConnectedCount,
  };
}
