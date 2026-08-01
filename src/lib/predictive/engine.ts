import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { websites, workspacePredictions } from "@/db/schema";
import { isPredictiveIntelEnabled } from "@/lib/predictive/flag";
import {
  listPredictiveWebsites,
  loadPredictiveFeedContext,
} from "@/lib/predictive/context";
import { forecastGrowth } from "@/lib/predictive/forecast-growth";
import { forecastRevenue } from "@/lib/predictive/forecast-revenue";
import { forecastSeo } from "@/lib/predictive/forecast-seo";
import { forecastCompetitive } from "@/lib/predictive/forecast-competitive";
import { forecastBusinessRisk } from "@/lib/predictive/forecast-risk";
import { forecastOpportunity } from "@/lib/predictive/forecast-opportunity";
import { detectMarketSignals } from "@/lib/predictive/market-signals";
import type { PredictionDraft } from "@/lib/predictive/types";

export async function buildPredictionDrafts(
  workspaceId: string,
  websiteId?: string | null,
): Promise<PredictionDraft[]> {
  const ctx = await loadPredictiveFeedContext(workspaceId, websiteId);
  return [
    forecastGrowth(ctx),
    forecastRevenue(ctx),
    forecastSeo(ctx),
    forecastCompetitive(ctx),
    forecastBusinessRisk(ctx),
    forecastOpportunity(ctx),
    detectMarketSignals(ctx),
  ];
}

export async function generateWorkspacePredictions(
  workspaceId: string,
  websiteId?: string | null,
) {
  if (!isPredictiveIntelEnabled()) {
    return {
      enabled: false as const,
      predictions: [],
      message: "Predictive Intelligence disabled",
    };
  }

  const ctx = await loadPredictiveFeedContext(workspaceId, websiteId);
  const drafts = await buildPredictionDrafts(workspaceId, ctx.websiteId);

  try {
    if (ctx.websiteId) {
      await db
        .delete(workspacePredictions)
        .where(
          and(
            eq(workspacePredictions.workspaceId, workspaceId),
            eq(workspacePredictions.websiteId, ctx.websiteId),
            eq(workspacePredictions.status, "open"),
          ),
        );
    } else {
      await db
        .delete(workspacePredictions)
        .where(
          and(
            eq(workspacePredictions.workspaceId, workspaceId),
            eq(workspacePredictions.status, "open"),
          ),
        );
    }
  } catch {
    /* soft */
  }

  const inserted = [];
  for (const d of drafts) {
    try {
      const [row] = await db
        .insert(workspacePredictions)
        .values({
          workspaceId,
          websiteId: d.websiteId ?? ctx.websiteId ?? null,
          kind: d.kind,
          title: d.title,
          prediction: d.prediction,
          evidence: d.evidence,
          confidence: d.confidence,
          horizon: d.horizon,
          recommendedAction: d.recommendedAction,
          impactEstimate: d.impactEstimate,
          status: "open",
          meta: {
            ...(d.meta ?? {}),
            websiteName: ctx.websiteName,
            websiteDomain: ctx.websiteDomain,
          },
        })
        .returning();
      if (row) inserted.push(row);
    } catch {
      /* soft per row */
    }
  }

  return {
    enabled: true as const,
    predictions: inserted,
    message: null,
    website: ctx.websiteId
      ? {
          id: ctx.websiteId,
          name: ctx.websiteName,
          domain: ctx.websiteDomain,
        }
      : null,
  };
}

export async function listWorkspacePredictions(
  workspaceId: string,
  opts?: { kind?: string; limit?: number; websiteId?: string | null },
) {
  try {
    const rows = await db.query.workspacePredictions.findMany({
      where: eq(workspacePredictions.workspaceId, workspaceId),
      orderBy: [desc(workspacePredictions.createdAt)],
      limit: opts?.limit ?? 40,
    });
    let filtered = rows;
    if (opts?.websiteId) {
      filtered = rows.filter((r) => r.websiteId === opts.websiteId);
    }
    if (opts?.kind) filtered = filtered.filter((r) => r.kind === opts.kind);
    return filtered;
  } catch {
    return [];
  }
}

export async function patchPredictionStatus(input: {
  workspaceId: string;
  id: string;
  status: "open" | "dismissed" | "acted";
}) {
  const [row] = await db
    .update(workspacePredictions)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(workspacePredictions.id, input.id))
    .returning();
  if (!row || row.workspaceId !== input.workspaceId) return null;
  return row;
}

export async function getPredictiveOverview(
  workspaceId: string,
  preferredWebsiteId?: string | null,
) {
  if (!isPredictiveIntelEnabled()) {
    return {
      enabled: false,
      message: "FEATURE_PREDICTIVE_INTEL is off",
      predictions: [],
      byKind: {} as Record<string, number>,
      openCount: 0,
      websites: [] as {
        id: string;
        name: string;
        domain: string;
        url: string;
      }[],
      focusWebsite: null as null | {
        id: string;
        name: string | null;
        domain: string | null;
      },
    };
  }

  const sites = await listPredictiveWebsites(workspaceId);
  const focus =
    (preferredWebsiteId && sites.find((s) => s.id === preferredWebsiteId)) ||
    sites[0] ||
    null;

  const predictions = await listWorkspacePredictions(workspaceId, {
    websiteId: focus?.id ?? null,
  });
  const open = predictions.filter((p) => p.status === "open");
  const byKind: Record<string, number> = {};
  for (const p of open) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
  }

  const siteById = new Map(sites.map((s) => [s.id, s]));
  const missingIds = [
    ...new Set(
      open
        .map((p) => p.websiteId)
        .filter(
          (id): id is string =>
            typeof id === "string" && id.length > 0 && !siteById.has(id),
        ),
    ),
  ];
  if (missingIds.length > 0) {
    const extra = await db.query.websites.findMany({
      where: inArray(websites.id, missingIds),
    });
    for (const s of extra) {
      siteById.set(s.id, {
        id: s.id,
        name: s.name,
        domain: s.domain,
        url: s.url,
      });
    }
  }

  return {
    enabled: true,
    message: null as string | null,
    websites: sites,
    focusWebsite: focus
      ? { id: focus.id, name: focus.name, domain: focus.domain }
      : null,
    predictions: open.slice(0, 20).map((p) => {
      const site = p.websiteId ? siteById.get(p.websiteId) : focus;
      const meta = (p.meta ?? {}) as {
        websiteName?: string | null;
        websiteDomain?: string | null;
      };
      return {
        id: p.id,
        kind: p.kind,
        title: p.title,
        prediction: p.prediction,
        evidence: p.evidence ?? [],
        confidence: p.confidence,
        horizon: p.horizon,
        recommendedAction: p.recommendedAction,
        impactEstimate: p.impactEstimate,
        status: p.status,
        websiteId: p.websiteId ?? focus?.id ?? null,
        websiteName: site?.name ?? meta.websiteName ?? null,
        websiteDomain: site?.domain ?? meta.websiteDomain ?? null,
      };
    }),
    byKind,
    openCount: open.length,
  };
}
