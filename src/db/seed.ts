import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  analysisJobs,
  competitors,
  dailyMetrics,
  moneyGaps,
  reports,
  users,
  websites,
  workspaceMembers,
  workspaces,
} from "./schema";
import { SAMPLE_METRICS, SAMPLE_REPORTS, SAMPLE_WEBSITES } from "../lib/sample-data";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = neon(url);
  const db = drizzle(sql);

  console.log("Seeding MoneyGap AI demo data...");

  await db
    .insert(users)
    .values({
      id: "user_demo_owner",
      email: "founder@aurora.store",
      firstName: "Maya",
      lastName: "Chen",
      imageUrl: null,
    })
    .onConflictDoNothing();

  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Aurora Commerce",
      slug: "aurora-commerce",
      ownerId: "user_demo_owner",
      plan: "growth",
    })
    .onConflictDoNothing()
    .returning();

  const workspaceId = workspace?.id ?? "11111111-1111-4111-8111-111111111111";

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId: "user_demo_owner",
      role: "owner",
    })
    .onConflictDoNothing();

  const websiteIdMap: Record<string, string> = {
    web_aurora: "22222222-2222-4222-8222-222222222201",
    web_northline: "22222222-2222-4222-8222-222222222202",
    web_lumen: "22222222-2222-4222-8222-222222222203",
  };

  for (const site of SAMPLE_WEBSITES) {
    await db
      .insert(websites)
      .values({
        id: websiteIdMap[site.id],
        workspaceId,
        name: site.name,
        url: site.url,
        domain: site.domain,
        status: site.status,
        monthlyTraffic: site.monthlyTraffic,
        estimatedRevenue: site.estimatedRevenue,
      })
      .onConflictDoNothing();
  }

  const reportIdMap: Record<string, string> = {
    rpt_aurora_q2: "33333333-3333-4333-8333-333333333301",
    rpt_northline_july: "33333333-3333-4333-8333-333333333302",
    rpt_lumen_baseline: "33333333-3333-4333-8333-333333333303",
  };

  for (const report of SAMPLE_REPORTS) {
    const reportId = reportIdMap[report.id];
    const websiteId = websiteIdMap[report.websiteId];

    await db
      .insert(reports)
      .values({
        id: reportId,
        websiteId,
        workspaceId,
        title: report.title,
        type: "sample",
        status: report.status,
        moneyGapScore: report.moneyGapScore,
        revenueAtRisk: report.revenueAtRisk,
        capturePotential: report.capturePotential,
        summary: report.summary,
        createdAt: new Date(report.createdAt),
      })
      .onConflictDoNothing();

    for (const [index, gap] of report.gaps.entries()) {
      await db
        .insert(moneyGaps)
        .values({
          reportId,
          category: gap.category,
          title: gap.title,
          description: gap.description,
          severity: gap.severity,
          estimatedImpact: gap.estimatedImpact,
          confidence: gap.confidence,
          status: gap.status,
          recommendation: gap.recommendation,
          sortOrder: index,
        })
        .onConflictDoNothing();
    }
  }

  const auroraId = websiteIdMap.web_aurora;
  for (const point of SAMPLE_METRICS) {
    await db
      .insert(dailyMetrics)
      .values({
        websiteId: auroraId,
        date: point.date,
        visitors: point.visitors,
        conversions: point.conversions,
        revenue: point.revenue,
        bounceRate: Math.round(point.bounceRate * 10),
      })
      .onConflictDoNothing();
  }

  await db
    .insert(competitors)
    .values([
      {
        websiteId: auroraId,
        name: "PeakForm",
        domain: "peakform.com",
        estimatedTraffic: 210000,
        notes: "Strong annual pricing framing",
      },
      {
        websiteId: auroraId,
        name: "Vessel Goods",
        domain: "vesselgoods.com",
        estimatedTraffic: 156000,
        notes: "Faster mobile checkout",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(analysisJobs)
    .values({
      websiteId: websiteIdMap.web_lumen,
      status: "queued",
      stage: "awaiting_crawl",
    })
    .onConflictDoNothing();

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
