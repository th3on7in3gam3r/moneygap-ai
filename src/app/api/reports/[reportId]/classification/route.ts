import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  businessProfiles,
  moneyGapOpportunities,
  reports,
  websiteClassifications,
  websitePages,
} from "@/db/schema";
import { assertReportAccess } from "@/lib/advisor/context";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import {
  buildBusinessModelGapSnapshot,
  buildIndustryGapSnapshot,
  buildRevenueArchitectureSnapshot,
  classifyBusiness,
  ensureKnowledgeCatalog,
  isBusinessModelSlug,
  isIndustrySlug,
  resolveIndustryPlaybook,
} from "@/lib/knowledge-graph";

const patchSchema = z.object({
  industrySlug: z.string().optional(),
  businessModelSlug: z.string().nullable().optional(),
});

function minimalIntelligence(
  business: typeof businessProfiles.$inferSelect | null,
): IntelligenceResult {
  return {
    overview: "",
    business: {
      industry: business?.industry ?? "",
      businessType: business?.businessType ?? "",
      companyType: business?.companyType ?? "",
      businessModel: business?.businessModel ?? "",
      revenueModel: business?.revenueModel ?? "",
      targetCustomer: business?.targetCustomer ?? "",
      targetMarket: business?.targetMarket ?? "",
      productsServices: business?.productsServices ?? [],
    },
    audience: {
      primaryAudience: "",
      secondaryAudience: "",
      customerProblems: [],
      customerGoals: [],
      buyingIntent: "",
    },
    products: {
      products: [],
      services: [],
      freeResources: [],
      digitalProducts: [],
      subscriptions: [],
      courses: [],
      consulting: [],
      community: [],
    },
    monetization: { present: [], missing: [] },
    content: {
      blogPresence: false,
      contentCategories: [],
      contentFrequency: "",
      educationalResources: [],
      seoOpportunities: [],
      contentStrengths: [],
      contentStrategy: "",
    },
    trust: {
      testimonials: false,
      reviews: false,
      caseStudies: false,
      socialProof: false,
      credentials: false,
      customerLogos: false,
      details: [],
    },
    score: {
      overall: 0,
      businessClarity: 0,
      audienceClarity: 0,
      monetizationVisibility: 0,
      contentAuthority: 0,
      trustSignals: 0,
    },
  };
}

function toFindings(
  opportunities: (typeof moneyGapOpportunities.$inferSelect)[],
): MoneyGapFinding[] {
  return opportunities.map((o) => ({
    moduleId: (o.moduleId ?? "revenue") as MoneyGapFinding["moduleId"],
    category: o.category,
    title: o.title,
    detectionStatus: "not_found" as const,
    summary: o.summary ?? o.title,
    whatsMissing: o.whatsMissing,
    whyItMatters: o.whyItMatters,
    businessImpact: o.businessImpact,
    estimatedAnnualRevenue: o.estimatedAnnualRevenue,
    estimatedLeads: o.estimatedLeads,
    estimatedTraffic: o.estimatedTraffic,
    estimatedConversionLift: o.estimatedConversionLift,
    estimateRationale: o.estimateRationale ?? "",
    confidence: o.confidence,
    likelyCauses: o.likelyCauses ?? [],
    fixes: [] as MoneyGapFinding["fixes"],
    helpfulResources: o.helpfulResources ?? [],
    severity: (o.severity ?? "medium") as MoneyGapFinding["severity"],
    difficulty: o.difficulty ?? "medium",
    estimatedTime: o.estimatedTime ?? "",
    expectedRoi: o.expectedRoi ?? 3,
    opportunityIndex: o.opportunityIndex ?? 50,
    priorityScore: o.priorityScore ?? 50,
    evidenceSummary: o.evidenceSummary ?? undefined,
    supportingSignals: o.supportingSignals ?? [],
    businessReasoning: o.businessReasoning ?? undefined,
    detectionSource: o.detectionSource ?? undefined,
    kgMeta: o.kgMeta ?? undefined,
  }));
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const industrySlug =
    parsed.data.industrySlug && isIndustrySlug(parsed.data.industrySlug)
      ? parsed.data.industrySlug
      : undefined;
  const modelRaw = parsed.data.businessModelSlug;
  if (modelRaw && !isBusinessModelSlug(modelRaw)) {
    return Response.json({ error: "Invalid business model" }, { status: 400 });
  }
  if (!industrySlug && modelRaw === undefined) {
    return Response.json({ error: "Provide industrySlug and/or businessModelSlug" }, { status: 400 });
  }
  if (parsed.data.industrySlug && !industrySlug) {
    return Response.json({ error: "Invalid industry" }, { status: 400 });
  }

  const businessModelSlug =
    modelRaw && isBusinessModelSlug(modelRaw) ? modelRaw : modelRaw === null ? null : undefined;

  try {
    await ensureKnowledgeCatalog();

    const existingClass = await db.query.websiteClassifications.findFirst({
      where: eq(websiteClassifications.analysisId, access.analysis.id),
    });

    const classification = classifyBusiness(minimalIntelligence(null), {
      override: {
        industrySlug:
          industrySlug ??
          (existingClass?.overrideIndustrySlug &&
          isIndustrySlug(existingClass.overrideIndustrySlug)
            ? existingClass.overrideIndustrySlug
            : existingClass?.industrySlug && isIndustrySlug(existingClass.industrySlug)
              ? existingClass.industrySlug
              : null),
        businessModelSlug:
          businessModelSlug !== undefined
            ? businessModelSlug
            : existingClass?.overrideBusinessModelSlug &&
                isBusinessModelSlug(existingClass.overrideBusinessModelSlug)
              ? existingClass.overrideBusinessModelSlug
              : existingClass?.businessModelSlug &&
                  isBusinessModelSlug(existingClass.businessModelSlug)
                ? existingClass.businessModelSlug
                : null,
      },
    });

    const analysisId = access.analysis.id;
    const classificationRow = {
      reportId,
      industrySlug: classification.industrySlug,
      businessModelSlug: classification.businessModelSlug,
      confidence: 100,
      signals: ["source:override"],
      modelEvidence: classification.modelEvidence,
      source: "override" as const,
      overrideIndustrySlug: classification.industrySlug,
      overrideBusinessModelSlug: classification.businessModelSlug,
      overriddenAt: new Date(),
      overriddenByUserId: userId,
    };

    if (existingClass) {
      await db
        .update(websiteClassifications)
        .set(classificationRow)
        .where(eq(websiteClassifications.id, existingClass.id));
    } else {
      await db.insert(websiteClassifications).values({
        analysisId,
        ...classificationRow,
      });
    }

    const business = await db.query.businessProfiles.findFirst({
      where: eq(businessProfiles.reportId, reportId),
    });
    const pages = await db.query.websitePages.findMany({
      where: eq(websitePages.analysisId, analysisId),
      limit: 40,
    });
    const corpus = pages.map((p) => p.markdown ?? "").join("\n\n");
    const opportunities = await db.query.moneyGapOpportunities.findMany({
      where: eq(moneyGapOpportunities.reportId, reportId),
    });
    const findings = toFindings(opportunities);
    const opportunityIdsByTitle = Object.fromEntries(
      opportunities.map((o) => [o.title, o.id]),
    );
    const intelligence = minimalIntelligence(business ?? null);

    const industryGapReport = await buildIndustryGapSnapshot({
      classification,
      intelligence,
      corpus,
      findings,
      opportunityIdsByTitle,
    });
    const revenueArchitecture = await buildRevenueArchitectureSnapshot({
      classification,
      intelligence,
      corpus,
      findings,
    });
    const businessModelGapReport = await buildBusinessModelGapSnapshot({
      classification,
      intelligence,
      corpus,
      findings,
      opportunityIdsByTitle,
      revenueArchitecture,
    });
    const industryPlaybook = await resolveIndustryPlaybook(classification);

    await db
      .update(reports)
      .set({
        industryGapReport,
        industryPlaybook,
        revenueArchitecture,
        businessModelGapReport,
      })
      .where(eq(reports.id, reportId));

    return Response.json({
      classification: {
        industrySlug: classification.industrySlug,
        businessModelSlug: classification.businessModelSlug,
        confidence: classification.confidence,
        source: classification.source,
        modelEvidence: classification.modelEvidence,
      },
      industryGapReport,
      industryPlaybook,
      revenueArchitecture,
      businessModelGapReport,
    });
  } catch {
    return Response.json({ error: "Could not update classification" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  await ensureKnowledgeCatalog();
  const row = await db.query.websiteClassifications.findFirst({
    where: eq(websiteClassifications.reportId, reportId),
  });
  const industries = await db.query.kgIndustries.findMany();
  const businessModels = await db.query.kgBusinessModels.findMany();

  return Response.json({
    classification: row
      ? {
          industrySlug: row.industrySlug,
          businessModelSlug: row.businessModelSlug,
          confidence: row.confidence,
          source: row.source,
          signals: row.signals,
          modelEvidence: row.modelEvidence,
        }
      : null,
    industries: industries
      .filter((i) => i.status === "active")
      .map((i) => ({ slug: i.slug, name: i.name })),
    businessModels: businessModels
      .filter((m) => m.status === "active")
      .map((m) => ({ slug: m.slug, name: m.name })),
  });
}
