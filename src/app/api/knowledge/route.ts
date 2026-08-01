import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listKnowledgeOverview } from "@/lib/knowledge-graph";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await loadAgencyContext();
    const data = await listKnowledgeOverview();
    return Response.json({
      industries: data.industries.map((i) => ({
        slug: i.slug,
        name: i.name,
        profile: i.profile,
        version: i.version,
        status: i.status,
        updatedAt: i.updatedAt.toISOString(),
      })),
      businessModels: data.businessModels.map((m) => ({
        slug: m.slug,
        name: m.name,
        description: m.description,
        typicalIndustries: m.typicalIndustries,
        profile: m.profile,
        version: m.version,
        status: m.status,
        updatedAt: m.updatedAt.toISOString(),
      })),
      patterns: data.patterns.map((p) => ({
        slug: p.slug,
        name: p.name,
        purpose: p.purpose,
        category: p.category,
        description: p.description,
        profile: p.profile,
        difficulty: p.difficulty,
        roiEstimate: p.roiEstimate,
        outcomes: p.outcomes,
        dependencies: p.dependencies,
        version: p.version,
        status: p.status,
        updatedAt: p.updatedAt.toISOString(),
      })),
      rules: data.rules.map((r) => ({
        slug: r.slug,
        name: r.name,
        enabled: r.enabled,
        priority: r.priority,
        conditions: r.conditions,
        actions: r.actions,
        version: r.version,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
      })),
      playbooks: data.playbooks.map((p) => ({
        slug: p.slug,
        name: p.name,
        industrySlug: p.industrySlug,
        businessModelSlug: p.businessModelSlug,
        patternSlugs: p.patternSlugs,
        steps: p.steps,
        version: p.version,
        status: p.status,
        updatedAt: p.updatedAt.toISOString(),
      })),
      recommendations: data.recommendations.map((r) => ({
        slug: r.slug,
        name: r.name,
        summary: r.summary,
        body: r.body,
        industrySlug: r.industrySlug,
        businessModelSlug: r.businessModelSlug,
        patternSlug: r.patternSlug,
        moduleId: r.moduleId,
        priority: r.priority,
        version: r.version,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
      })),
      versions: data.versions.map((v) => ({
        version: v.version,
        notes: v.notes,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
