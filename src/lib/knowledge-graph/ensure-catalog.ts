import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  kgBusinessModels,
  kgEntities,
  kgIndustries,
  kgPatterns,
  kgPlaybooks,
  kgRecommendations,
  kgRules,
  kgVersions,
  type KgBusinessModelProfile,
  type KgIndustryProfile,
  type KgPatternProfile,
} from "@/db/schema";
import {
  SEED_ENTITIES,
  SEED_INDUSTRIES,
  SEED_MODELS,
  SEED_PATTERNS,
  SEED_PLAYBOOKS,
  SEED_RECOMMENDATIONS,
  SEED_RULES,
} from "@/lib/knowledge-graph/catalog-data";
import { KNOWLEDGE_GRAPH_VERSION } from "@/lib/knowledge-graph/taxonomy";

let ensured = false;

function mergeIndustryProfile(
  existing: KgIndustryProfile,
  seed: KgIndustryProfile,
): KgIndustryProfile {
  return {
    ...existing,
    ...seed,
    revenueModels: seed.revenueModels?.length ? seed.revenueModels : existing.revenueModels,
    trustSignals: seed.trustSignals?.length ? seed.trustSignals : existing.trustSignals,
    marketingChannels: seed.marketingChannels?.length
      ? seed.marketingChannels
      : existing.marketingChannels,
    websiteFeatures: seed.websiteFeatures?.length
      ? seed.websiteFeatures
      : existing.websiteFeatures,
    contentStrategy: seed.contentStrategy?.length
      ? seed.contentStrategy
      : existing.contentStrategy,
    integrations: seed.integrations?.length ? seed.integrations : existing.integrations,
    growthPriorities: seed.growthPriorities?.length
      ? seed.growthPriorities
      : existing.growthPriorities,
    characteristics: seed.characteristics ?? existing.characteristics,
    commonGaps: seed.commonGaps ?? existing.commonGaps,
    conversionPatterns: seed.conversionPatterns ?? existing.conversionPatterns,
    seoExpectations: seed.seoExpectations ?? existing.seoExpectations,
    description: seed.description ?? existing.description,
    benchmarks: seed.benchmarks ?? existing.benchmarks,
  };
}

function mergePatternProfile(
  existing: KgPatternProfile | null | undefined,
  seed: KgPatternProfile,
): KgPatternProfile {
  if (!existing) return seed;
  return {
    ...existing,
    ...seed,
    applicableIndustries: seed.applicableIndustries.length
      ? seed.applicableIndustries
      : existing.applicableIndustries,
    applicableBusinessModels: seed.applicableBusinessModels.length
      ? seed.applicableBusinessModels
      : existing.applicableBusinessModels,
    requiredConditions: seed.requiredConditions.length
      ? seed.requiredConditions
      : existing.requiredConditions,
    maturityLevels: seed.maturityLevels.length ? seed.maturityLevels : existing.maturityLevels,
    goalTypes: seed.goalTypes.length ? seed.goalTypes : existing.goalTypes,
    implementationSteps: seed.implementationSteps.length
      ? seed.implementationSteps
      : existing.implementationSteps,
    impactScore: seed.impactScore || existing.impactScore,
    revenuePotential: seed.revenuePotential || existing.revenuePotential,
    expectedOutcomes: seed.expectedOutcomes ?? existing.expectedOutcomes,
  };
}

export async function ensureKnowledgeCatalog() {
  if (ensured) return;
  for (const row of SEED_INDUSTRIES) {
    const existing = await db.query.kgIndustries.findFirst({
      where: eq(kgIndustries.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgIndustries).values({
        slug: row.slug,
        name: row.name,
        profile: row.profile,
        sortOrder: row.sortOrder,
      });
    } else {
      const needsEnrichment =
        !existing.profile.description ||
        !existing.profile.benchmarks ||
        !existing.profile.commonGaps;
      if (needsEnrichment) {
        await db
          .update(kgIndustries)
          .set({
            profile: mergeIndustryProfile(existing.profile, row.profile),
            name: row.name,
            sortOrder: row.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(kgIndustries.slug, row.slug));
      }
    }
  }
  for (const row of SEED_MODELS) {
    const existing = await db.query.kgBusinessModels.findFirst({
      where: eq(kgBusinessModels.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgBusinessModels).values(row);
    } else if (!existing.profile?.revenueStages?.length) {
      await db
        .update(kgBusinessModels)
        .set({
          name: row.name,
          description: row.description,
          typicalIndustries: row.typicalIndustries,
          profile: row.profile as KgBusinessModelProfile,
          sortOrder: row.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(kgBusinessModels.slug, row.slug));
    }
  }
  for (const row of SEED_ENTITIES) {
    const existing = await db.query.kgEntities.findFirst({
      where: eq(kgEntities.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgEntities).values(row);
    }
  }
  for (const row of SEED_PATTERNS) {
    const existing = await db.query.kgPatterns.findFirst({
      where: eq(kgPatterns.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgPatterns).values(row);
    } else if (!existing.category || !existing.profile?.implementationSteps?.length) {
      await db
        .update(kgPatterns)
        .set({
          name: row.name,
          purpose: row.purpose,
          category: row.category,
          description: row.description,
          profile: mergePatternProfile(existing.profile, row.profile),
          outcomes: row.outcomes,
          dependencies: row.dependencies,
          difficulty: row.difficulty,
          roiEstimate: row.roiEstimate,
          relatedEntitySlugs: row.relatedEntitySlugs,
          updatedAt: new Date(),
        })
        .where(eq(kgPatterns.slug, row.slug));
    }
  }
  for (const row of SEED_RULES) {
    const existing = await db.query.kgRules.findFirst({
      where: eq(kgRules.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgRules).values({
        slug: row.slug,
        name: row.name,
        enabled: true,
        priority: row.priority,
        conditions: row.conditions,
        actions: row.actions,
      });
    }
  }
  for (const row of SEED_PLAYBOOKS) {
    const existing = await db.query.kgPlaybooks.findFirst({
      where: eq(kgPlaybooks.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgPlaybooks).values(row);
    } else if (!existing.patternSlugs?.length) {
      await db
        .update(kgPlaybooks)
        .set({
          name: row.name,
          industrySlug: row.industrySlug,
          businessModelSlug: row.businessModelSlug ?? null,
          steps: row.steps,
          patternSlugs: row.patternSlugs,
          updatedAt: new Date(),
        })
        .where(eq(kgPlaybooks.slug, row.slug));
    }
  }
  for (const row of SEED_RECOMMENDATIONS) {
    const existing = await db.query.kgRecommendations.findFirst({
      where: eq(kgRecommendations.slug, row.slug),
    });
    if (!existing) {
      await db.insert(kgRecommendations).values({
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        body: row.body,
        industrySlug: row.industrySlug ?? null,
        businessModelSlug: row.businessModelSlug ?? null,
        patternSlug: row.patternSlug ?? null,
        moduleId: row.moduleId ?? null,
        priority: row.priority,
      });
    }
  }
  const ver = await db.query.kgVersions.findFirst({
    where: eq(kgVersions.version, KNOWLEDGE_GRAPH_VERSION),
  });
  if (!ver) {
    await db.insert(kgVersions).values({
      version: KNOWLEDGE_GRAPH_VERSION,
      notes:
        "Growth Pattern Library — categorized patterns, matching engine, local/nonprofit playbooks",
    });
  }
  ensured = true;
}
