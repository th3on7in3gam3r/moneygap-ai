import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { productMetricsEvents, websiteAnalyses } from "@/db/schema";
import { isStripeConfigured } from "@/lib/billing/stripe";
import {
  isMaintenanceMode,
  isTrustEngineEnabled,
} from "@/lib/observability/logger";
import { isPlatform10Enabled } from "@/lib/launch/flag";
import { isMarketplaceEnabled } from "@/lib/marketplace/flag";
import { isTeamWorkspaceEnabled } from "@/lib/team/flag";
import { isAutomationEngineEnabled } from "@/lib/automation/flag";
import { isPredictiveIntelEnabled } from "@/lib/predictive/flag";
import { isGrowthCopilotEnabled } from "@/lib/copilot/flag";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [failedRow] = await db
    .select({ value: count() })
    .from(websiteAnalyses)
    .where(
      and(
        eq(websiteAnalyses.status, "failed"),
        gte(websiteAnalyses.completedAt, since),
      ),
    );

  const [completedRow] = await db
    .select({ value: count() })
    .from(websiteAnalyses)
    .where(
      and(
        eq(websiteAnalyses.status, "completed"),
        gte(websiteAnalyses.completedAt, since),
      ),
    );

  const recentFailures = await db.query.websiteAnalyses.findMany({
    where: and(
      eq(websiteAnalyses.status, "failed"),
      gte(websiteAnalyses.completedAt, since),
    ),
    columns: {
      id: true,
      url: true,
      error: true,
      completedAt: true,
      durationMs: true,
    },
    orderBy: [desc(websiteAnalyses.completedAt)],
    limit: 8,
  });

  const metricCounts = await db
    .select({
      type: productMetricsEvents.type,
      total: sql<number>`coalesce(sum(${productMetricsEvents.value}), 0)`,
    })
    .from(productMetricsEvents)
    .where(gte(productMetricsEvents.createdAt, since))
    .groupBy(productMetricsEvents.type);

  let health: { ok: boolean; db: boolean } = { ok: false, db: false };
  try {
    await db.execute(sql`select 1`);
    health = { ok: true, db: true };
  } catch {
    health = { ok: false, db: false };
  }

  const billingEvents = metricCounts.filter((m) => {
    // soft: billing markers stored under report_created meta — count all metrics as platform analytics
    return true;
  });

  return Response.json({
    health,
    flags: {
      trustEngine: isTrustEngineEnabled(),
      maintenanceMode: isMaintenanceMode(),
      platform10: isPlatform10Enabled(),
      marketplace: isMarketplaceEnabled(),
      teamWorkspace: isTeamWorkspaceEnabled(),
      automation: isAutomationEngineEnabled(),
      predictive: isPredictiveIntelEnabled(),
      copilot: isGrowthCopilotEnabled(),
    },
    readiness: {
      stripeConfigured: isStripeConfigured(),
      cronSecretSet: !!(
        process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0
      ),
      encryptionKeySet: !!(
        process.env.INTEGRATION_ENCRYPTION_KEY &&
        process.env.INTEGRATION_ENCRYPTION_KEY.trim().length > 0
      ),
      openaiSet: !!(
        process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0
      ),
    },
    analyses: {
      failedLast7Days: Number(failedRow?.value ?? 0),
      completedLast7Days: Number(completedRow?.value ?? 0),
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        url: f.url,
        error: f.error,
        completedAt: f.completedAt?.toISOString() ?? null,
        durationMs: f.durationMs,
      })),
    },
    metricsLast7Days: Object.fromEntries(
      metricCounts.map((m) => [m.type, Number(m.total)]),
    ),
    platformAnalytics: {
      eventTypes: billingEvents.length,
      labeled: "observed",
    },
  });
}
