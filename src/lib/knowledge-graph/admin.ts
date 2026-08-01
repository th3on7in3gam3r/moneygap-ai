import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  kgBusinessModels,
  kgIndustries,
  kgPatterns,
  kgPlaybooks,
  kgRecommendations,
  kgRules,
  kgVersions,
  type KgBusinessModelProfile,
  type KgEntryStatus,
  type KgPatternCategory,
  type KgPatternProfile,
  type KgPlaybookStep,
  type KgRuleActions,
  type KgRuleConditions,
} from "@/db/schema";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";

export async function listKnowledgeOverview() {
  await ensureKnowledgeCatalog();
  const [industries, businessModels, patterns, rules, playbooks, recommendations, versions] =
    await Promise.all([
      db.query.kgIndustries.findMany({ orderBy: [asc(kgIndustries.sortOrder)] }),
      db.query.kgBusinessModels.findMany({ orderBy: [asc(kgBusinessModels.sortOrder)] }),
      db.query.kgPatterns.findMany(),
      db.query.kgRules.findMany({ orderBy: [desc(kgRules.priority)] }),
      db.query.kgPlaybooks.findMany(),
      db.query.kgRecommendations.findMany({
        orderBy: [desc(kgRecommendations.priority)],
      }),
      db.query.kgVersions.findMany({ orderBy: [desc(kgVersions.createdAt)] }),
    ]);
  return {
    industries,
    businessModels,
    patterns,
    rules,
    playbooks,
    recommendations,
    versions,
  };
}

export async function setRuleEnabled(slug: string, enabled: boolean) {
  const [row] = await db
    .update(kgRules)
    .set({
      enabled,
      status: enabled ? "active" : "deprecated",
      updatedAt: new Date(),
    })
    .where(eq(kgRules.slug, slug))
    .returning();
  return row ?? null;
}

export async function updateRule(
  slug: string,
  patch: Partial<{
    name: string;
    enabled: boolean;
    priority: number;
    conditions: KgRuleConditions;
    actions: KgRuleActions;
    status: KgEntryStatus;
  }>,
) {
  const status =
    patch.status ??
    (patch.enabled === undefined
      ? undefined
      : patch.enabled
        ? ("active" as const)
        : ("deprecated" as const));
  const [row] = await db
    .update(kgRules)
    .set({
      ...patch,
      ...(status !== undefined ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kgRules.slug, slug))
    .returning();
  return row ?? null;
}

export async function setIndustryStatus(slug: string, status: KgEntryStatus) {
  const [row] = await db
    .update(kgIndustries)
    .set({ status, updatedAt: new Date() })
    .where(eq(kgIndustries.slug, slug))
    .returning();
  return row ?? null;
}

export async function updateIndustryProfile(
  slug: string,
  patch: {
    status?: KgEntryStatus;
    description?: string;
    commonGaps?: string[];
    characteristics?: string[];
    conversionPatterns?: string[];
    seoExpectations?: string[];
    benchmarks?: {
      expectedFeatures: string[];
      peerCategoryTargets?: Record<string, number>;
      notes?: string;
    };
  },
) {
  const existing = await db.query.kgIndustries.findFirst({
    where: eq(kgIndustries.slug, slug),
  });
  if (!existing) return null;

  const profile = {
    ...existing.profile,
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.commonGaps !== undefined ? { commonGaps: patch.commonGaps } : {}),
    ...(patch.characteristics !== undefined
      ? { characteristics: patch.characteristics }
      : {}),
    ...(patch.conversionPatterns !== undefined
      ? { conversionPatterns: patch.conversionPatterns }
      : {}),
    ...(patch.seoExpectations !== undefined
      ? { seoExpectations: patch.seoExpectations }
      : {}),
    ...(patch.benchmarks !== undefined ? { benchmarks: patch.benchmarks } : {}),
  };

  const [row] = await db
    .update(kgIndustries)
    .set({
      profile,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kgIndustries.slug, slug))
    .returning();
  return row ?? null;
}

export async function setPatternStatus(slug: string, status: KgEntryStatus) {
  const [row] = await db
    .update(kgPatterns)
    .set({ status, updatedAt: new Date() })
    .where(eq(kgPatterns.slug, slug))
    .returning();
  return row ?? null;
}

export async function updatePatternProfile(
  slug: string,
  patch: {
    status?: KgEntryStatus;
    category?: KgPatternCategory;
    description?: string;
    purpose?: string;
    profile?: Partial<KgPatternProfile>;
  },
) {
  const existing = await db.query.kgPatterns.findFirst({
    where: eq(kgPatterns.slug, slug),
  });
  if (!existing) return null;

  const nextProfile: KgPatternProfile | null = patch.profile
    ? {
        applicableIndustries:
          patch.profile.applicableIndustries ??
          existing.profile?.applicableIndustries ??
          [],
        applicableBusinessModels:
          patch.profile.applicableBusinessModels ??
          existing.profile?.applicableBusinessModels ??
          [],
        requiredConditions:
          patch.profile.requiredConditions ?? existing.profile?.requiredConditions ?? [],
        maturityLevels:
          patch.profile.maturityLevels ?? existing.profile?.maturityLevels ?? [],
        goalTypes: patch.profile.goalTypes ?? existing.profile?.goalTypes ?? [],
        implementationSteps:
          patch.profile.implementationSteps ??
          existing.profile?.implementationSteps ??
          [],
        impactScore:
          patch.profile.impactScore ?? existing.profile?.impactScore ?? 50,
        revenuePotential:
          patch.profile.revenuePotential ?? existing.profile?.revenuePotential ?? 3,
        expectedOutcomes:
          patch.profile.expectedOutcomes ?? existing.profile?.expectedOutcomes,
      }
    : existing.profile ?? null;

  const [row] = await db
    .update(kgPatterns)
    .set({
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.purpose !== undefined ? { purpose: patch.purpose } : {}),
      ...(nextProfile ? { profile: nextProfile } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kgPatterns.slug, slug))
    .returning();
  return row ?? null;
}

export async function setPlaybookStatus(slug: string, status: KgEntryStatus) {
  const [row] = await db
    .update(kgPlaybooks)
    .set({ status, updatedAt: new Date() })
    .where(eq(kgPlaybooks.slug, slug))
    .returning();
  return row ?? null;
}

export async function updatePlaybook(
  slug: string,
  patch: {
    status?: KgEntryStatus;
    patternSlugs?: string[];
    steps?: KgPlaybookStep[];
    name?: string;
  },
) {
  const existing = await db.query.kgPlaybooks.findFirst({
    where: eq(kgPlaybooks.slug, slug),
  });
  if (!existing) return null;

  const [row] = await db
    .update(kgPlaybooks)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.patternSlugs !== undefined ? { patternSlugs: patch.patternSlugs } : {}),
      ...(patch.steps !== undefined ? { steps: patch.steps } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kgPlaybooks.slug, slug))
    .returning();
  return row ?? null;
}

export async function setBusinessModelStatus(slug: string, status: KgEntryStatus) {
  const [row] = await db
    .update(kgBusinessModels)
    .set({ status, updatedAt: new Date() })
    .where(eq(kgBusinessModels.slug, slug))
    .returning();
  return row ?? null;
}

export async function updateBusinessModelProfile(
  slug: string,
  patch: {
    status?: KgEntryStatus;
    description?: string;
    profile?: Partial<KgBusinessModelProfile>;
  },
) {
  const existing = await db.query.kgBusinessModels.findFirst({
    where: eq(kgBusinessModels.slug, slug),
  });
  if (!existing) return null;

  const nextProfile: KgBusinessModelProfile | null = patch.profile
    ? {
        revenueStructure:
          patch.profile.revenueStructure ?? existing.profile?.revenueStructure ?? [],
        customerJourney:
          patch.profile.customerJourney ?? existing.profile?.customerJourney ?? [],
        growthLevers: patch.profile.growthLevers ?? existing.profile?.growthLevers ?? [],
        commonGaps: patch.profile.commonGaps ?? existing.profile?.commonGaps ?? [],
        trustRequirements:
          patch.profile.trustRequirements ?? existing.profile?.trustRequirements ?? [],
        conversionPatterns:
          patch.profile.conversionPatterns ?? existing.profile?.conversionPatterns ?? [],
        retentionStrategies:
          patch.profile.retentionStrategies ?? existing.profile?.retentionStrategies ?? [],
        revenueStages: patch.profile.revenueStages ?? existing.profile?.revenueStages ?? [],
        benchmarks: patch.profile.benchmarks ?? existing.profile?.benchmarks,
      }
    : existing.profile;

  const [row] = await db
    .update(kgBusinessModels)
    .set({
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(nextProfile ? { profile: nextProfile } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kgBusinessModels.slug, slug))
    .returning();
  return row ?? null;
}

export async function getIndustry(slug: string) {
  return db.query.kgIndustries.findFirst({ where: eq(kgIndustries.slug, slug) });
}

export async function getPlaybook(slug: string) {
  return db.query.kgPlaybooks.findFirst({ where: eq(kgPlaybooks.slug, slug) });
}

export async function getPattern(slug: string) {
  return db.query.kgPatterns.findFirst({ where: eq(kgPatterns.slug, slug) });
}
