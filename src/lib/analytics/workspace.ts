import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { dailyMetrics, scoreSnapshots, websites } from "@/db/schema";
import { listUserWebsites } from "@/lib/analysis/reports";
import type { DailyPoint } from "@/lib/types/money-gap";

export type AnalyticsWebsite = {
  id: string;
  name: string;
  domain: string;
  url: string;
  status: string;
  latestScore: number | null;
  latestRevenueAtRisk: number | null;
  latestReportId: string | null;
};

export type ScorePoint = {
  date: string;
  score: number;
  revenueAtRisk: number;
  capturePotential: number;
};

export type WebsiteAnalytics = {
  website: AnalyticsWebsite;
  dailySeries: DailyPoint[];
  scoreSeries: ScorePoint[];
  totals: {
    visitors: number;
    conversions: number;
    revenue: number;
    avgBounce: number;
  } | null;
};

export async function listAnalyticsWebsites(
  userId: string,
): Promise<AnalyticsWebsite[]> {
  const sites = await listUserWebsites(userId);
  return sites.map(({ website, latestReport }) => ({
    id: website.id,
    name: website.name,
    domain: website.domain,
    url: website.url,
    status: website.status,
    latestScore: latestReport?.moneyGapScore ?? null,
    latestRevenueAtRisk: latestReport?.revenueAtRisk ?? null,
    latestReportId: latestReport?.id ?? null,
  }));
}

export async function getWebsiteAnalytics(
  websiteId: string,
): Promise<WebsiteAnalytics | null> {
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, websiteId),
  });
  if (!website) return null;

  const [metrics, snapshots] = await Promise.all([
    db.query.dailyMetrics.findMany({
      where: eq(dailyMetrics.websiteId, websiteId),
      orderBy: [asc(dailyMetrics.date)],
      limit: 90,
    }),
    db.query.scoreSnapshots.findMany({
      where: eq(scoreSnapshots.websiteId, websiteId),
      orderBy: [asc(scoreSnapshots.createdAt)],
      limit: 90,
    }),
  ]);

  const dailySeries: DailyPoint[] = metrics.map((m) => ({
    date: String(m.date),
    visitors: m.visitors,
    conversions: m.conversions,
    revenue: m.revenue,
    bounceRate: m.bounceRate,
  }));

  const byDay = new Map<string, ScorePoint>();
  for (const s of snapshots) {
    const date = s.createdAt.toISOString().slice(0, 10);
    byDay.set(date, {
      date,
      score: s.moneyGapScore,
      revenueAtRisk: s.revenueAtRisk,
      capturePotential: s.capturePotential,
    });
  }
  const scoreSeries = [...byDay.values()];

  let totals: WebsiteAnalytics["totals"] = null;
  if (dailySeries.length > 0) {
    const sum = dailySeries.reduce(
      (acc, d) => ({
        visitors: acc.visitors + d.visitors,
        conversions: acc.conversions + d.conversions,
        revenue: acc.revenue + d.revenue,
        bounce: acc.bounce + d.bounceRate,
      }),
      { visitors: 0, conversions: 0, revenue: 0, bounce: 0 },
    );
    totals = {
      visitors: sum.visitors,
      conversions: sum.conversions,
      revenue: sum.revenue,
      avgBounce: sum.bounce / dailySeries.length,
    };
  }

  return {
    website: {
      id: website.id,
      name: website.name,
      domain: website.domain,
      url: website.url,
      status: website.status,
      latestScore: scoreSeries.at(-1)?.score ?? null,
      latestRevenueAtRisk: scoreSeries.at(-1)?.revenueAtRisk ?? null,
      latestReportId: snapshots.at(-1)?.reportId ?? null,
    },
    dailySeries,
    scoreSeries,
    totals,
  };
}

/** Prefer a specific site, else the most recently analyzed one. */
export async function resolveAnalyticsWebsite(
  userId: string,
  preferredId?: string | null,
): Promise<{
  sites: AnalyticsWebsite[];
  selected: WebsiteAnalytics | null;
}> {
  const sites = await listAnalyticsWebsites(userId);
  if (sites.length === 0) {
    return { sites: [], selected: null };
  }

  const match =
    (preferredId && sites.find((s) => s.id === preferredId)) || sites[0]!;
  const selected = await getWebsiteAnalytics(match.id);
  return { sites, selected };
}

export async function getWorkspaceDailySeries(
  workspaceId: string,
): Promise<DailyPoint[]> {
  const sites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
    columns: { id: true },
  });
  if (sites.length === 0) return [];

  const rows = await db.query.dailyMetrics.findMany({
    where: inArray(
      dailyMetrics.websiteId,
      sites.map((s) => s.id),
    ),
    orderBy: [desc(dailyMetrics.date)],
    limit: 30,
  });

  const byDate = new Map<string, DailyPoint>();
  for (const m of rows) {
    const date = String(m.date);
    const cur = byDate.get(date) ?? {
      date,
      visitors: 0,
      conversions: 0,
      revenue: 0,
      bounceRate: 0,
    };
    cur.visitors += m.visitors;
    cur.conversions += m.conversions;
    cur.revenue += m.revenue;
    cur.bounceRate = Math.round((cur.bounceRate + m.bounceRate) / 2);
    byDate.set(date, cur);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
