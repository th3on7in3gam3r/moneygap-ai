import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { requireFeature, requireFeatureAndUsage, recordUsage, upgradeResponse } from "@/lib/billing";
import { getOiSummaryForWebsite } from "@/lib/opportunity-intelligence";

function toCsv(rows: Record<string, string | number | null>[]) {
  if (rows.length === 0) return "title,kind,opportunityScore,businessImpact\n";
  const keys = Object.keys(rows[0]!);
  const escape = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k] ?? null)).join(","))].join(
    "\n",
  );
}

function toMarkdown(summary: Awaited<ReturnType<typeof getOiSummaryForWebsite>>) {
  if (!summary.ok) return "# Opportunity Intelligence™\n\nNo data.\n";
  const lines = [
    `# Opportunity Intelligence™ — ${summary.website.domain}`,
    "",
    summary.snapshot?.executiveBlurb ?? "",
    "",
    "## Top recommendations",
    "",
  ];
  for (const r of summary.recommendations.slice(0, 20)) {
    lines.push(
      `### ${r.title}`,
      "",
      `- Kind: ${r.kind}`,
      `- Opportunity Score™: ${r.opportunityScore}`,
      `- Business impact: ${r.businessImpact}`,
      `- SEO impact: ${r.seoImpact}`,
      `- AI readiness impact: ${r.aiReadinessImpact}`,
      `- Effort: ${r.difficulty} · ${r.estimatedTime}`,
      "",
      r.whyItMatters,
      "",
    );
  }
  lines.push("## Content Roadmap™", "");
  for (const item of summary.roadmap) {
    lines.push(
      `- **${item.title}** — score ${item.opportunityScore} · ${item.businessImpact} impact · ${item.estimatedTime}`,
    );
  }
  lines.push("");
  // Phase 2: Excel / full PDF / digest deep section
  return lines.join("\n");
}

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const feature = await requireFeature(
      ctx.workspace.id,
      "opportunity_intelligence",
    );
    if (!feature.ok) return upgradeResponse(feature);

    const usage = await requireFeatureAndUsage({
      workspaceId: ctx.workspace.id,
      feature: "opportunity_intelligence",
      usageType: "export",
    });
    if (!usage.ok) return upgradeResponse(usage);

    const url = new URL(req.url);
    const websiteId = url.searchParams.get("websiteId");
    const format = (url.searchParams.get("format") ?? "json").toLowerCase();
    if (!websiteId) {
      return Response.json({ error: "websiteId required" }, { status: 400 });
    }

    const summary = await getOiSummaryForWebsite({
      workspaceId: ctx.workspace.id,
      websiteId,
    });
    if (!summary.ok) {
      return Response.json({ error: summary.error }, { status: 404 });
    }

    await recordUsage({
      workspaceId: ctx.workspace.id,
      type: "export",
      quantity: 1,
      meta: { source: "opportunity_intelligence", format },
    });

    if (format === "md" || format === "markdown") {
      const body = toMarkdown(summary);
      return new Response(body, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="opportunity-intelligence-${summary.website.domain}.md"`,
        },
      });
    }

    if (format === "csv") {
      const rows = summary.recommendations.map((r) => ({
        title: r.title,
        kind: r.kind,
        opportunityScore: r.opportunityScore,
        businessImpact: r.businessImpact,
        seoImpact: r.seoImpact,
        aiReadinessImpact: r.aiReadinessImpact,
        difficulty: r.difficulty,
        estimatedTime: r.estimatedTime,
      }));
      return new Response(toCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="opportunity-intelligence-${summary.website.domain}.csv"`,
        },
      });
    }

    // json (default). Phase 2: xlsx, pdf
    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        website: summary.website,
        snapshot: summary.snapshot,
        recommendations: summary.recommendations,
        roadmap: summary.roadmap,
        briefs: summary.briefs,
        graph: summary.graph,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="opportunity-intelligence-${summary.website.domain}.json"`,
        },
      },
    );
  } catch {
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
