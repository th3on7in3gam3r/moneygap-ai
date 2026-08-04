import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationFindings,
  selfOptimizationMetadataDrafts,
} from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getScanSummaries,
  isSelfOptimizationEnabled,
  markStaleRunningFailed,
  resolveSelfScanTarget,
  runSelfOptimizationScan,
  upsertSelfOptSettings,
  validateSelfOptimizationUrl,
} from "@/lib/self-optimization";
import {
  listWorkspaceWebsites,
  type WorkspaceWebsite,
} from "@/lib/websites/workspace";

export const maxDuration = 60;

function websiteMatchesUrl(site: WorkspaceWebsite, url: string): boolean {
  try {
    const a = new URL(site.url).hostname.replace(/^www\./, "").toLowerCase();
    const b = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return a === b || site.domain.replace(/^www\./, "").toLowerCase() === b;
  } catch {
    return (
      site.url.includes(url) ||
      url.includes(site.domain) ||
      site.domain.includes(url)
    );
  }
}

function resolveSelectedWebsite(
  sites: WorkspaceWebsite[],
  preferredId: string | null,
  targetUrl: string,
): WorkspaceWebsite | null {
  if (preferredId) {
    const match = sites.find((s) => s.id === preferredId);
    if (match) return match;
  }
  return sites.find((s) => websiteMatchesUrl(s, targetUrl)) ?? null;
}

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    await markStaleRunningFailed(workspace.id);
    const enabled = isSelfOptimizationEnabled();
    const target = await resolveSelfScanTarget(workspace.id);
    const websites = await listWorkspaceWebsites(workspace.id);

    const requestedId =
      new URL(req.url).searchParams.get("websiteId")?.trim() || null;
    const selected = resolveSelectedWebsite(
      websites,
      requestedId,
      target.url,
    );
    const selectedWebsiteId = selected?.id ?? null;
    const displayUrl = selected?.url
      ? (() => {
          const v = validateSelfOptimizationUrl(selected.url);
          return v.ok ? v.value.origin : selected.url;
        })()
      : target.url;

    const summaries = await getScanSummaries(workspace.id, {
      websiteId: selectedWebsiteId,
      targetUrl: displayUrl,
    });

    const latestFindings = summaries.latest
      ? await db
          .select()
          .from(selfOptimizationFindings)
          .where(eq(selfOptimizationFindings.scanId, summaries.latest.id))
          .orderBy(desc(selfOptimizationFindings.estimatedOpportunity))
          .limit(25)
      : [];

    const drafts = await db
      .select()
      .from(selfOptimizationMetadataDrafts)
      .where(eq(selfOptimizationMetadataDrafts.workspaceId, workspace.id))
      .orderBy(desc(selfOptimizationMetadataDrafts.createdAt))
      .limit(10);

    const scores = summaries.latest?.scores ?? null;

    return Response.json({
      enabled: enabled && target.enabled,
      message: !enabled
        ? "Self Optimization™ is disabled (FEATURE_SELF_OPTIMIZATION)."
        : target.message,
      targetUrl: displayUrl,
      targetSource: selected ? "workspace" : target.source,
      websites,
      selectedWebsiteId,
      scores: scores
        ? {
            overall: scores.overall,
            seo: scores.seo,
            trust: scores.trust,
            conversion: scores.conversion,
            performance: scores.performance,
            aiVisibility: scores.aiVisibility,
            contentCoverage: scores.contentCoverage,
            backlinkHealth: scores.backlinkHealth,
            crawlability: scores.crawlability,
            crawlabilityStatus: scores.crawlabilityStatus,
            crawlabilityContributors: scores.crawlabilityContributors,
            crawlabilitySummary: scores.crawlabilitySummary,
            crawlabilityEstimatedImprovement:
              scores.crawlabilityEstimatedImprovement,
            privacy: scores.privacy,
            privacyStatus: scores.privacyStatus,
            privacyContributors: scores.privacyContributors,
            privacySummary: scores.privacySummary,
            privacyEstimatedImprovement: scores.privacyEstimatedImprovement,
            unavailableReasons: scores.unavailableReasons ?? {},
            estimatedOpportunity: scores.estimatedOpportunity,
            labeled: "AI Estimate",
          }
        : null,
      latestScan: (summaries.latestAny ?? summaries.latest)
        ? {
            id: (summaries.latestAny ?? summaries.latest)!.id,
            status: (summaries.latestAny ?? summaries.latest)!.status,
            summary: (summaries.latestAny ?? summaries.latest)!.summary,
            error: (summaries.latestAny ?? summaries.latest)!.error,
            targetUrl: (summaries.latestAny ?? summaries.latest)!.targetUrl,
            reportId: (summaries.latestAny ?? summaries.latest)!.reportId,
            websiteId: (summaries.latestAny ?? summaries.latest)!.websiteId,
            finishedAt:
              (summaries.latestAny ?? summaries.latest)!.finishedAt?.toISOString() ??
              null,
            createdAt: (
              summaries.latestAny ?? summaries.latest
            )!.createdAt.toISOString(),
          }
        : null,
      trend: summaries.trend,
      deltas: summaries.deltas,
      crawlability: summaries.crawlability,
      privacy: summaries.privacy,
      findings: latestFindings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        problem: f.problem,
        businessImpact: f.businessImpact,
        whyItMatters: f.whyItMatters,
        estimatedOpportunity: f.estimatedOpportunity,
        estimateLabeled: f.estimateLabeled,
        confidence: f.confidence,
        evidence: f.evidence,
        fixPath: f.fixPath,
        difficulty: f.difficulty,
        estimatedTime: f.estimatedTime,
        priority: f.priority,
        verificationSteps: f.verificationSteps,
        prompts: f.prompts,
        pageUrl: f.pageUrl,
        opportunityId: f.opportunityId,
        reportId: summaries.latest?.reportId ?? null,
      })),
      drafts: drafts.map((d) => ({
        id: d.id,
        pageUrl: d.pageUrl,
        status: d.status,
        proposedTitle: d.proposedTitle,
        proposedDescription: d.proposedDescription,
        snippet: d.snippet,
        currentTitle: d.currentTitle,
        currentDescription: d.currentDescription,
      })),
      stats: {
        dailyCount: summaries.dailyCount,
        weeklyCount: summaries.weeklyCount,
        monthlyCount: summaries.monthlyCount,
        resolvedHint: summaries.resolvedHint,
      },
    });
  } catch (err) {
    console.error("self-optimization GET", err);
    return Response.json(
      { error: "Could not load Self Optimization™" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    let body: {
      action?: string;
      targetUrl?: string;
      websiteId?: string;
      enabled?: boolean;
    } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    if (body.action === "settings") {
      let targetUrl = body.targetUrl;
      if (body.websiteId) {
        const websites = await listWorkspaceWebsites(workspace.id);
        const site = websites.find((s) => s.id === body.websiteId);
        if (!site) {
          return Response.json(
            { ok: false, error: "Website not found in this workspace." },
            { status: 404 },
          );
        }
        const v = validateSelfOptimizationUrl(site.url);
        targetUrl = v.ok ? v.value.origin : site.url;
      }

      const row = await upsertSelfOptSettings(workspace.id, {
        targetUrl,
        enabled: body.enabled,
      });
      return Response.json({
        ok: true,
        settings: row,
        selectedWebsiteId: body.websiteId ?? null,
        targetUrl: row.targetUrl,
      });
    }

    if (!isSelfOptimizationEnabled()) {
      return Response.json(
        {
          ok: false,
          message: "Self Optimization™ is disabled.",
        },
        { status: 200 },
      );
    }

    // Optional: switch target before running scan
    if (body.websiteId || body.targetUrl) {
      let targetUrl = body.targetUrl;
      if (body.websiteId) {
        const websites = await listWorkspaceWebsites(workspace.id);
        const site = websites.find((s) => s.id === body.websiteId);
        if (site) {
          const v = validateSelfOptimizationUrl(site.url);
          targetUrl = v.ok ? v.value.origin : site.url;
        }
      }
      if (targetUrl) {
        await upsertSelfOptSettings(workspace.id, { targetUrl });
      }
    }

    // Run after the response so local self-scans can fetch this same server
    // without deadlocking the in-flight POST.
    after(() => {
      void runSelfOptimizationScan({
        workspaceId: workspace.id,
        trigger: "manual",
      }).catch((e) => console.error("self-opt scan", e));
    });

    return Response.json({
      ok: true,
      started: true,
      message: "Self scan started. Scores will appear when probes finish.",
    });
  } catch (err) {
    console.error("self-optimization POST", err);
    return Response.json({ error: "Scan failed", detail: String(err) }, { status: 500 });
  }
}
