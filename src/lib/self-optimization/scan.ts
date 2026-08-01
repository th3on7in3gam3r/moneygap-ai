import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  selfOptimizationFindings,
  selfOptimizationMetadataDrafts,
  selfOptimizationScans,
  selfOptimizationScores,
  selfOptimizationSettings,
  websiteAnalyses,
  websites,
} from "@/db/schema";
import { scoreBacklinks } from "./backlinks/probe";
import { resolveSelfScanTarget, validateSelfOptimizationUrl } from "./config";
import { pathsToProbe, scoreContentCoverage } from "./content-gaps/catalog";
import { scoreConversion } from "./conversion/heuristics";
import { isSelfOptimizationEnabled } from "./flag";
import { proposeMetadata } from "./metadata/generate";
import { scorePerformance } from "./performance/probe";
import { attachPrompts } from "./prompts/generate";
import { rollupScores, sumEstimatedOpportunity } from "./scores/rollup";
import { scoreAiVisibility } from "./ai-visibility/score";
import { fetchPages } from "./seo/scan-html";
import { fetchSiteFiles } from "./seo/site-files";
import { scoreSeo } from "./seo/score";
import { scoreTrust } from "./trust/heuristics";
import type { SelfOptFindingInput } from "./types";

/** Scans left in "running" after a crash / killed dev server block the UI forever. */
const STALE_RUNNING_MS = 90_000;

export async function markStaleRunningFailed(workspaceId: string) {
  const rows = await db
    .select({
      id: selfOptimizationScans.id,
      startedAt: selfOptimizationScans.startedAt,
      createdAt: selfOptimizationScans.createdAt,
    })
    .from(selfOptimizationScans)
    .where(
      and(
        eq(selfOptimizationScans.workspaceId, workspaceId),
        eq(selfOptimizationScans.status, "running"),
      ),
    );

  const cutoff = Date.now() - STALE_RUNNING_MS;
  const staleIds = rows
    .filter((r) => (r.startedAt ?? r.createdAt).getTime() < cutoff)
    .map((r) => r.id);

  for (const id of staleIds) {
    await db
      .update(selfOptimizationScans)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error:
          "Scan timed out or was interrupted. Try Run self scan again.",
      })
      .where(eq(selfOptimizationScans.id, id));
  }
}

async function ensureSelfWebsite(workspaceId: string, targetUrl: string) {
  const validated = validateSelfOptimizationUrl(targetUrl);
  if (!validated.ok) throw new Error(validated.error);

  const existing = await db.query.websites.findFirst({
    where: and(
      eq(websites.workspaceId, workspaceId),
      eq(websites.domain, validated.value.domain),
    ),
  });

  if (existing) {
    await db
      .update(websites)
      .set({
        url: validated.value.href,
        name: existing.name || validated.value.domain,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, existing.id));
    return existing;
  }

  const [site] = await db
    .insert(websites)
    .values({
      workspaceId,
      name: validated.value.domain,
      url: validated.value.href,
      domain: validated.value.domain,
      status: "active",
    })
    .returning();
  return site;
}

async function linkLatestAnalysis(websiteId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(
      eq(websiteAnalyses.websiteId, websiteId),
      eq(websiteAnalyses.status, "completed"),
    ),
    orderBy: [desc(websiteAnalyses.completedAt)],
  });
  return analysis
    ? { analysisId: analysis.id, reportId: analysis.reportId }
    : { analysisId: null, reportId: null };
}

export async function runSelfOptimizationScan(opts: {
  workspaceId: string;
  trigger?: "manual" | "cron";
}): Promise<{
  ok: boolean;
  scanId?: string;
  error?: string;
  message?: string;
}> {
  if (!isSelfOptimizationEnabled()) {
    return {
      ok: false,
      error: "disabled",
      message: "Self Optimization™ is disabled (FEATURE_SELF_OPTIMIZATION).",
    };
  }

  const target = await resolveSelfScanTarget(opts.workspaceId);
  if (!target.enabled) {
    return { ok: false, error: "disabled", message: target.message ?? "Disabled" };
  }

  await markStaleRunningFailed(opts.workspaceId);

  const [scan] = await db
    .insert(selfOptimizationScans)
    .values({
      workspaceId: opts.workspaceId,
      targetUrl: target.url,
      status: "running",
      startedAt: new Date(),
      summary: `Self scan (${opts.trigger ?? "manual"})`,
    })
    .returning();

  try {
    const site = await ensureSelfWebsite(opts.workspaceId, target.url);
    const linked = await linkLatestAnalysis(site.id);

    await db
      .update(selfOptimizationScans)
      .set({
        websiteId: site.id,
        analysisId: linked.analysisId,
        reportId: linked.reportId,
      })
      .where(eq(selfOptimizationScans.id, scan.id));

    const probePaths = pathsToProbe().slice(0, 12);
    const [pages, siteFiles] = await Promise.all([
      fetchPages(target.url, probePaths),
      fetchSiteFiles(target.url),
    ]);

    const seo = scoreSeo(pages, siteFiles);
    const content = scoreContentCoverage(pages);
    const trust = scoreTrust(pages);
    const conversion = scoreConversion(pages);
    const performance = scorePerformance(pages);
    const aiVisibility = scoreAiVisibility(pages, siteFiles);
    const backlinkHealth = scoreBacklinks();

    const breakdown = rollupScores({
      seo,
      trust,
      conversion,
      performance,
      aiVisibility,
      contentCoverage: content,
      backlinkHealth,
    });

    let findings: SelfOptFindingInput[] = [
      ...seo.findings,
      ...content.findings,
      ...trust.findings,
      ...conversion.findings,
      ...performance.findings,
      ...aiVisibility.findings,
      ...backlinkHealth.findings,
    ];

    // Soft-link open Money Gap opportunities from latest report (real data only)
    if (linked.reportId) {
      const opps = await db.query.moneyGapOpportunities.findMany({
        where: eq(moneyGapOpportunities.reportId, linked.reportId),
        orderBy: [desc(moneyGapOpportunities.priorityScore)],
        limit: 15,
      });
      for (const o of opps) {
        findings.push({
          category: o.category || "money_gap",
          title: o.title,
          problem: o.whatsMissing || o.summary || o.title,
          businessImpact: o.businessImpact || "See Money Gap report for impact.",
          whyItMatters: o.whyItMatters || o.summary || "",
          estimatedOpportunity: o.estimatedAnnualRevenue,
          estimateLabeled: "AI Estimate",
          confidence: o.confidence ?? 50,
          evidence: [
            ...(o.supportingSignals ?? []).slice(0, 5),
            o.evidenceSummary ? o.evidenceSummary.slice(0, 240) : "",
          ].filter(Boolean),
          fixPath:
            (o.fixes?.[0] as { action?: string } | undefined)?.action ||
            "Open the report Fix Path™ for this opportunity.",
          difficulty: o.difficulty || "medium",
          estimatedTime: o.estimatedTime || "TBD",
          verificationSteps: [
            "Re-analyze the site after implementing the fix",
            "Confirm opportunity lifecycle moves to improved/resolved",
          ],
          opportunityId: o.id,
        });
      }
    }

    findings = attachPrompts(findings, {
      product: "MoneyGap AI",
      targetUrl: target.url,
    });

    // Metadata draft for homepage (preview only)
    const home =
      pages.find((p) => {
        try {
          const path = new URL(p.url).pathname;
          return (path === "/" || path === "") && p.status === 200;
        } catch {
          return false;
        }
      }) ?? pages.find((p) => p.status === 200);

    let homeDraftId: string | null = null;
    if (home) {
      const proposal = proposeMetadata(home);
      const [draft] = await db
        .insert(selfOptimizationMetadataDrafts)
        .values({
          workspaceId: opts.workspaceId,
          scanId: scan.id,
          pageUrl: proposal.pageUrl,
          currentTitle: proposal.currentTitle,
          currentDescription: proposal.currentDescription,
          currentOg: proposal.currentOg,
          currentTwitter: proposal.currentTwitter,
          currentCanonical: proposal.currentCanonical,
          currentJsonLd: proposal.currentJsonLd,
          proposedTitle: proposal.proposedTitle,
          proposedDescription: proposal.proposedDescription,
          proposedOg: proposal.proposedOg,
          proposedTwitter: proposal.proposedTwitter,
          proposedCanonical: proposal.proposedCanonical,
          proposedJsonLd: proposal.proposedJsonLd,
          snippet: proposal.snippet,
          status: "draft",
        })
        .returning();
      homeDraftId = draft.id;
    }

    const estimatedOpportunity = sumEstimatedOpportunity(findings);

    await db.insert(selfOptimizationScores).values({
      scanId: scan.id,
      overall: breakdown.overall,
      seo: breakdown.seo,
      trust: breakdown.trust,
      conversion: breakdown.conversion,
      performance: breakdown.performance,
      aiVisibility: breakdown.aiVisibility,
      contentCoverage: breakdown.contentCoverage,
      backlinkHealth: breakdown.backlinkHealth,
      unavailableReasons: breakdown.unavailableReasons,
      estimatedOpportunity,
    });

    for (const f of findings.slice(0, 80)) {
      await db.insert(selfOptimizationFindings).values({
        scanId: scan.id,
        opportunityId: f.opportunityId ?? null,
        metadataDraftId:
          homeDraftId && f.category === "metadata" && f.pageUrl === home?.url
            ? homeDraftId
            : null,
        category: f.category,
        title: f.title,
        problem: f.problem,
        businessImpact: f.businessImpact,
        whyItMatters: f.whyItMatters,
        estimatedOpportunity: f.estimatedOpportunity,
        estimateLabeled: "AI Estimate",
        confidence: f.confidence,
        evidence: f.evidence,
        fixPath: f.fixPath,
        difficulty: f.difficulty,
        estimatedTime: f.estimatedTime,
        verificationSteps: f.verificationSteps,
        prompts: f.prompts ?? null,
        pageUrl: f.pageUrl ?? null,
      });
    }

    const reachable = pages.filter((p) => p.status === 200).length;
    const status =
      reachable === 0
        ? "failed"
        : reachable < pages.length / 2
          ? "partial"
          : "completed";

    const unreachableError =
      reachable === 0
        ? `Could not fetch ${target.url} (0/${pages.length} URLs OK). On Vercel, serverless often cannot HTTP-call its own URL — ensure FIRECRAWL_API_KEY is set, or point SELF_OPTIMIZATION_URL at https://www.moneygap-ai.com. Locally use http://localhost:3002.`
        : null;

    await db
      .update(selfOptimizationScans)
      .set({
        status,
        finishedAt: new Date(),
        summary: `Scanned ${pages.length} URLs (${reachable} OK). Overall ${breakdown.overall ?? "n/a"}. Findings ${findings.length}.`,
        error: unreachableError,
      })
      .where(eq(selfOptimizationScans.id, scan.id));

    return {
      ok: status !== "failed",
      scanId: scan.id,
      error: unreachableError ?? undefined,
      message:
        status === "failed"
          ? unreachableError ?? "Scan failed"
          : status === "partial"
            ? `Partial scan: ${reachable}/${pages.length} URLs reachable.`
            : undefined,
    };
  } catch (err) {
    await db
      .update(selfOptimizationScans)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: String(err),
      })
      .where(eq(selfOptimizationScans.id, scan.id));
    return { ok: false, scanId: scan.id, error: String(err) };
  }
}

/** Cron: scan every workspace that has self-opt settings enabled, or all with recent activity soft-fail. */
export async function runDailySelfScan(opts?: { dryRun?: boolean }) {
  if (!isSelfOptimizationEnabled()) {
    return { ok: true, skipped: true, message: "Feature disabled", ran: 0 };
  }

  const settings = await db.select().from(selfOptimizationSettings);
  const workspacesToScan = new Set<string>();
  for (const s of settings) {
    if (s.enabled !== false) workspacesToScan.add(s.workspaceId);
  }

  // Also include workspaces that own the self domain website if settings empty
  if (workspacesToScan.size === 0) {
    const target = validateSelfOptimizationUrl(
      process.env.SELF_OPTIMIZATION_URL ||
        process.env.APP_URL ||
        "https://www.moneygap-ai.com",
    );
    if (target.ok) {
      const sites = await db
        .select()
        .from(websites)
        .where(eq(websites.domain, target.value.domain))
        .limit(20);
      for (const s of sites) workspacesToScan.add(s.workspaceId);
    }
  }

  if (opts?.dryRun) {
    return { ok: true, dryRun: true, ran: 0, pending: workspacesToScan.size };
  }

  const results: { workspaceId: string; ok: boolean; scanId?: string }[] = [];
  for (const workspaceId of workspacesToScan) {
    const r = await runSelfOptimizationScan({ workspaceId, trigger: "cron" });
    results.push({ workspaceId, ok: r.ok, scanId: r.scanId });
  }

  return { ok: true, ran: results.length, results };
}
