import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * MoneyGap AI schema
 * Phase 1: SaaS foundation
 * Phase 2: Website intelligence analysis
 */

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("individual"),
    // individual | agency | enterprise
    plan: text("plan").notNull().default("free"),
    // free | starter | growth | professional | agency | enterprise
    // (legacy: small_agency | growth_agency | scale)
    agencyName: text("agency_name"),
    websiteUrl: text("website_url"),
    contactEmail: text("contact_email"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("workspaces_owner_idx").on(t.ownerId)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    // owner | admin | executive | marketing | developer | analyst | client_manager | viewer | client
    // (legacy: member → analyst)
    /** Phase 21: required when role === "client" — scopes visibility to one Agency client record */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_members_workspace_idx").on(t.workspaceId),
    index("workspace_members_user_idx").on(t.userId),
    index("workspace_members_client_idx").on(t.clientId),
  ],
);

/** Phase 7: Agency clients */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    websiteUrl: text("website_url"),
    industry: text("industry"),
    audience: text("audience"),
    status: text("status").notNull().default("active"), // active | archived
    assignedUserId: text("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("clients_workspace_idx").on(t.workspaceId),
    index("clients_status_idx").on(t.status),
  ],
);

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    status: text("status").notNull().default("active"), // active | analyzing | queued | error
    monthlyTraffic: integer("monthly_traffic").notNull().default(0),
    estimatedRevenue: integer("estimated_revenue").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("websites_workspace_idx").on(t.workspaceId),
    index("websites_client_idx").on(t.clientId),
  ],
);

export type GrowthRoadmapItem = {
  title: string;
  action: string;
  expectedOutcome: string;
  difficulty: string;
  businessImpact: string;
  opportunityId?: string | null;
};

export type CategoryScores = {
  revenue: number;
  authority: number;
  seo: number;
  content: number;
  trust: number;
  conversion: number;
  marketing: number;
  automation: number;
  customer: number;
  ai: number;
  competitive: number;
};

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull().default("sample"), // sample | intelligence
    status: text("status").notNull().default("ready"), // draft | ready | archived
    moneyGapScore: integer("money_gap_score").notNull().default(0),
    revenueAtRisk: integer("revenue_at_risk").notNull().default(0),
    capturePotential: integer("capture_potential").notNull().default(0),
    intelligenceScore: integer("intelligence_score"),
    scoreBreakdown: jsonb("score_breakdown").$type<{
      businessClarity: number;
      audienceClarity: number;
      monetizationVisibility: number;
      contentAuthority: number;
      trustSignals: number;
    }>(),
    overview: text("overview"),
    summary: text("summary"),
    opportunitySummary: text("opportunity_summary"),
    executiveBrief: text("executive_brief"),
    categoryScores: jsonb("category_scores").$type<{
      revenue: number;
      authority: number;
      seo: number;
      content: number;
      trust: number;
      conversion: number;
      marketing: number;
      automation: number;
      customer: number;
      ai: number;
      competitive: number;
    }>(),
    growthRoadmap: jsonb("growth_roadmap").$type<{
      today: GrowthRoadmapItem[];
      thisWeek: GrowthRoadmapItem[];
      thisMonth: GrowthRoadmapItem[];
      nextQuarter: GrowthRoadmapItem[];
    }>(),
    moneyGapEngineStatus: text("money_gap_engine_status").default("pending"),
    // pending | completed | failed
    moneyGapEngineError: text("money_gap_engine_error"),
    competitiveEngineStatus: text("competitive_engine_status").default("pending"),
    // pending | completed | failed
    competitiveEngineError: text("competitive_engine_error"),
    competitiveBrief: text("competitive_brief"),
    competitiveAnalysis: jsonb("competitive_analysis").$type<CompetitiveAnalysisPayload>(),
    /** Phase 13 Knowledge Graph™ industry playbook snapshot */
    industryPlaybook: jsonb("industry_playbook").$type<IndustryPlaybookSnapshot | null>(),
    /** Phase 13.2 Industry Intelligence™ gap report */
    industryGapReport: jsonb("industry_gap_report").$type<IndustryGapSnapshot | null>(),
    /** Phase 13.3 Business Model Intelligence™ */
    revenueArchitecture: jsonb("revenue_architecture").$type<RevenueArchitectureSnapshot | null>(),
    businessModelGapReport: jsonb("business_model_gap_report").$type<BusinessModelGapSnapshot | null>(),
    /** Phase 13.4 Growth Pattern Library™ */
    patternMatchReport: jsonb("pattern_match_report").$type<PatternMatchSnapshot | null>(),
    /** Crawlability Score™ (health; higher = better) */
    crawlabilityReport: jsonb("crawlability_report").$type<CrawlabilityReportSnapshot | null>(),
    /** Privacy Score™ (health; higher = better) */
    privacyReport: jsonb("privacy_report").$type<PrivacyReportSnapshot | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("reports_website_idx").on(t.websiteId),
    index("reports_workspace_idx").on(t.workspaceId),
    index("reports_type_idx").on(t.type),
  ],
);

export type CrawlabilityReportSnapshot = {
  score: number | null;
  status: string | null;
  contributors: CrawlabilityContributorScores | null;
  executiveSummary: string | null;
  estimatedImprovement: string | null;
  unavailableReasons: Record<string, string>;
  previousScore?: number | null;
  delta?: number | null;
  findingCount?: number;
};

export type PrivacyContributorScores = {
  consentUx: number | null;
  cookieSecurity: number | null;
  policyDocs: number | null;
  trackingHygiene: number | null;
  thirdPartyExposure: number | null;
  consentStorage: number | null;
};

export type PrivacyReportSnapshot = {
  score: number | null;
  status: string | null;
  contributors: PrivacyContributorScores | null;
  executiveSummary: string | null;
  estimatedImprovement: string | null;
  unavailableReasons: Record<string, string>;
  previousScore?: number | null;
  delta?: number | null;
  findingCount?: number;
  trackingDetected?: string[];
};

export type IndustryPlaybookSnapshot = {
  slug: string;
  name: string;
  industrySlug: string;
  businessModelSlug?: string | null;
  patternSlugs?: string[];
  steps: {
    title: string;
    action: string;
    patternSlug?: string;
    patternName?: string;
    moduleId?: string;
    order: number;
  }[];
};

export type CompetitorProfileData = {
  businessOverview: string;
  revenueModel: string;
  products: string[];
  services: string[];
  pricingVisibility: string;
  leadGeneration: string;
  contentStrategy: string;
  trustSignals: string;
  callsToAction: string;
  newsletter: string;
  community: string;
  digitalProducts: string;
  memberships: string;
  affiliateProgram: string;
  consulting: string;
  automation: string;
  aiFeatures: string;
  overallStrengths: string[];
  overallWeaknesses: string[];
};

export type CompetitiveGapItem = {
  title: string;
  competitorName: string;
  competitorHas: string;
  userMissing: string;
  whyItMatters: string;
  estimatedOpportunity: string;
  priority: "critical" | "high" | "medium" | "low";
  recommendation: string;
};

export type HeadToHeadRow = {
  competitorName: string;
  competitorDomain: string;
  category: string;
  you: string;
  competitor: string;
  gap: string;
  businessImpact: string;
  priority: "critical" | "high" | "medium" | "low";
};

export type StrategicRecommendation = {
  rank: number;
  title: string;
  action: string;
  businessImpact: string;
  easeOfImplementation: string;
  expectedRoi: string;
  priority: "critical" | "high" | "medium" | "low";
};

export type CompetitiveTimelineItem = {
  timeframe: "today" | "this_week" | "this_month" | "next_quarter";
  title: string;
  action: string;
  expectedOutcome: string;
  priority: string;
};

export type CompetitiveAnalysisPayload = {
  headToHead: HeadToHeadRow[];
  opportunityGaps: CompetitiveGapItem[];
  contentGaps: CompetitiveGapItem[];
  authorityGaps: CompetitiveGapItem[];
  monetizationGaps: CompetitiveGapItem[];
  advantages: { title: string; description: string; howToLeanIn: string }[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: StrategicRecommendation[];
  opportunityTimeline: CompetitiveTimelineItem[];
  competitorCount: number;
};

export const moneyGaps = pgTable(
  "money_gaps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull(), // critical | high | medium | low
    estimatedImpact: integer("estimated_impact").notNull().default(0),
    confidence: integer("confidence").notNull().default(80),
    status: text("status").notNull().default("open"),
    recommendation: text("recommendation"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("money_gaps_report_idx").on(t.reportId)],
);

export type OpportunityFix = {
  tier: "quick_win" | "medium" | "long_term";
  action: string;
  difficulty: string;
  estimatedTime: string;
  priority: string;
  expectedImpact: string;
  resources?: string | null;
};

export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    visitors: integer("visitors").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    revenue: integer("revenue").notNull().default(0),
    bounceRate: integer("bounce_rate").notNull().default(0),
  },
  (t) => [
    index("daily_metrics_website_idx").on(t.websiteId),
    index("daily_metrics_date_idx").on(t.date),
  ],
);

/** Phase 4: Competitive Intelligence™ */
export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").references(() => websiteAnalyses.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    url: text("url"),
    businessSummary: text("business_summary"),
    industry: text("industry"),
    targetAudience: text("target_audience"),
    estimatedCompanySize: text("estimated_company_size"),
    estimatedTraffic: integer("estimated_traffic"),
    profile: jsonb("profile").$type<CompetitorProfileData>(),
    corpusExcerpt: text("corpus_excerpt"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("discovered"),
    // discovered | crawled | profiled | failed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("competitors_website_idx").on(t.websiteId),
    index("competitors_report_idx").on(t.reportId),
    index("competitors_analysis_idx").on(t.analysisId),
  ],
);

/** Future queue adapter — Phase 2 uses websiteAnalyses as primary job model */
export const analysisJobs = pgTable(
  "analysis_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"), // queued | running | completed | failed
    stage: text("stage"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("analysis_jobs_website_idx").on(t.websiteId)],
);

/** Phase 2: Website intelligence analysis jobs */
export const websiteAnalyses = pgTable(
  "website_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    status: text("status").notNull().default("queued"), // queued | running | completed | failed
    stage: text("stage").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    engineVersion: text("engine_version"),
    trustVersion: text("trust_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("website_analyses_user_idx").on(t.userId),
    index("website_analyses_workspace_idx").on(t.workspaceId),
    index("website_analyses_website_idx").on(t.websiteId),
    index("website_analyses_status_idx").on(t.status),
  ],
);

export const websitePages = pgTable(
  "website_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pageType: text("page_type").notNull().default("other"),
    // homepage | nav | about | services | products | pricing | blog | contact | faq | resources | other
    title: text("title"),
    markdown: text("markdown"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("website_pages_analysis_idx").on(t.analysisId),
    index("website_pages_type_idx").on(t.pageType),
  ],
);

export const businessProfiles = pgTable(
  "business_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" })
      .unique(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    industry: text("industry"),
    businessType: text("business_type"),
    companyType: text("company_type"),
    businessModel: text("business_model"),
    revenueModel: text("revenue_model"),
    targetCustomer: text("target_customer"),
    targetMarket: text("target_market"),
    productsServices: jsonb("products_services").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("business_profiles_analysis_idx").on(t.analysisId),
    index("business_profiles_report_idx").on(t.reportId),
  ],
);

export const audienceProfiles = pgTable(
  "audience_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" })
      .unique(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    primaryAudience: text("primary_audience"),
    secondaryAudience: text("secondary_audience"),
    customerProblems: jsonb("customer_problems").$type<string[]>().default([]),
    customerGoals: jsonb("customer_goals").$type<string[]>().default([]),
    buyingIntent: text("buying_intent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audience_profiles_analysis_idx").on(t.analysisId),
    index("audience_profiles_report_idx").on(t.reportId),
  ],
);

export const contentAnalyses = pgTable(
  "content_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" })
      .unique(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    blogPresence: boolean("blog_presence").notNull().default(false),
    contentCategories: jsonb("content_categories").$type<string[]>().default([]),
    contentFrequency: text("content_frequency"),
    educationalResources: jsonb("educational_resources").$type<string[]>().default([]),
    seoOpportunities: jsonb("seo_opportunities").$type<string[]>().default([]),
    contentStrengths: jsonb("content_strengths").$type<string[]>().default([]),
    contentStrategy: text("content_strategy"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("content_analyses_analysis_idx").on(t.analysisId),
    index("content_analyses_report_idx").on(t.reportId),
  ],
);

export const websiteInsights = pgTable(
  "website_insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // monetization | trust | product | general
    key: text("key").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    present: boolean("present"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("website_insights_analysis_idx").on(t.analysisId),
    index("website_insights_report_idx").on(t.reportId),
    index("website_insights_category_idx").on(t.category),
  ],
);

/** Phase 3: Money Gap Engine opportunities */
export const moneyGapOpportunities = pgTable(
  "money_gap_opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull().default("revenue"),
    title: text("title").notNull(),
    category: text("category").notNull(),
    detectionStatus: text("detection_status").notNull().default("not_found"),
    // found | not_found | partial
    summary: text("summary"),
    whatsMissing: text("whats_missing").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    businessImpact: text("business_impact").notNull(),
    estimatedAnnualRevenue: integer("estimated_annual_revenue"),
    estimatedLeads: integer("estimated_leads"),
    estimatedTraffic: integer("estimated_traffic"),
    estimatedConversionLift: integer("estimated_conversion_lift"),
    estimateRationale: text("estimate_rationale"),
    confidence: integer("confidence").notNull().default(70),
    likelyCauses: jsonb("likely_causes").$type<string[]>().default([]),
    fixes: jsonb("fixes").$type<OpportunityFix[]>().default([]),
    helpfulResources: jsonb("helpful_resources").$type<string[]>().default([]),
    severity: text("severity").notNull().default("medium"),
    difficulty: text("difficulty").notNull().default("medium"),
    estimatedTime: text("estimated_time"),
    expectedRoi: integer("expected_roi").notNull().default(3), // 1-5
    opportunityIndex: integer("opportunity_index").notNull().default(50),
    priorityScore: integer("priority_score").notNull().default(50),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("open"), // workflow: open | in_progress | resolved | dismissed
    implementationStatus: text("implementation_status").notNull().default("open"),
    // open | saved | in_progress | completed
    lifecycleStatus: text("lifecycle_status").notNull().default("detected"),
    // detected | reviewed | planned | in_progress | completed | improved | resolved
    /** Phase 11 Trust Engine™ */
    evidenceSummary: text("evidence_summary"),
    supportingSignals: jsonb("supporting_signals").$type<string[]>().default([]),
    businessReasoning: text("business_reasoning"),
    detectionSource: text("detection_source"),
    confidenceLevel: text("confidence_level"),
    // very_high | high | medium | low
    trustMeta: jsonb("trust_meta").$type<TrustMetaJson>(),
    /** Phase 13 Knowledge Graph™ soft-boost metadata */
    kgMeta: jsonb("kg_meta").$type<KgMetaJson>(),
    /** Phase 16 Confidence & Implementation Intelligence™ */
    confidenceIntel: jsonb("confidence_intel").$type<ConfidenceIntelJson>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("money_gap_opportunities_report_idx").on(t.reportId),
    index("money_gap_opportunities_analysis_idx").on(t.analysisId),
    index("money_gap_opportunities_category_idx").on(t.category),
    index("money_gap_opportunities_module_idx").on(t.moduleId),
    index("money_gap_opportunities_impl_status_idx").on(t.implementationStatus),
    index("money_gap_opportunities_lifecycle_idx").on(t.lifecycleStatus),
  ],
);

export type TrustMetaJson = {
  factors?: {
    detectionQuality?: number;
    dataCompleteness?: number;
    industryConfidence?: number;
    aiCertainty?: number;
  };
  suppressed?: boolean;
  suppressReason?: string;
  mergedFrom?: string[];
  qaFlags?: string[];
};

export type ConfidenceIntelJson = {
  version: string;
  overall: number;
  engines: {
    business: number;
    developer: number;
    data: number;
    benchmark: number;
    ai: number;
  };
  risk: {
    level: "low" | "medium" | "high";
    breakingChanges: number;
    deployment: number;
    database: number;
    security: number;
    rollbackComplexity: number;
    summary: string;
  };
  impact: {
    labeled: "estimated";
    revenue?: number;
    seo?: number;
    trust?: number;
    conversion?: number;
    authority?: number;
    automation?: number;
    summary: string;
  };
  explainability: {
    evidence: string[];
    benchmarkContext?: string;
    kgRules?: string[];
    businessModelReasoning?: string;
    industryReasoning?: string;
  };
  validationChecklist: string[];
};

export type KgMetaJson = {
  industrySlug?: string;
  businessModelSlug?: string;
  ruleHits?: string[];
  patternHits?: string[];
  priorityBoost?: number;
  industryFitNote?: string;
  businessModelFitNote?: string;
  patternFitNote?: string;
};

export type AssetSection = {
  id: string;
  heading: string;
  body: string;
};

/** Phase 5: Action Projects™ */
export const actionProjects = pgTable(
  "action_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    // active | paused | completed | archived
    priority: text("priority").notNull().default("medium"),
    progress: integer("progress").notNull().default(0),
    businessImpact: text("business_impact"),
    estimatedCompletion: text("estimated_completion"),
    playbook: text("playbook").notNull().default("generic"),
    assigneeUserId: text("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    deadline: timestamp("deadline", { withTimezone: true }),
    clientNotes: text("client_notes"),
    /** Phase 21: optional link to Automation Growth Sprint */
    sprintId: uuid("sprint_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("action_projects_report_idx").on(t.reportId),
    index("action_projects_user_idx").on(t.userId),
    index("action_projects_opportunity_idx").on(t.opportunityId),
    index("action_projects_assignee_idx").on(t.assigneeUserId),
    index("action_projects_sprint_idx").on(t.sprintId),
  ],
);

export const actionProjectTasks = pgTable(
  "action_project_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => actionProjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("action_project_tasks_project_idx").on(t.projectId)],
);

export const generatedAssets = pgTable(
  "generated_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playbook: text("playbook").notNull().default("generic"),
    title: text("title").notNull(),
    content: jsonb("content").$type<AssetSection[]>().default([]),
    status: text("status").notNull().default("draft"), // draft | saved
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("generated_assets_report_idx").on(t.reportId),
    index("generated_assets_user_idx").on(t.userId),
  ],
);

export const advisorMessages = pgTable(
  "advisor_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull(),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("advisor_messages_report_idx").on(t.reportId),
    index("advisor_messages_user_idx").on(t.userId),
  ],
);

/** Phase 6: MoneyGap Monitor™ */
export const monitorSchedules = pgTable(
  "monitor_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    frequency: text("frequency").notNull().default("weekly"),
    // weekly | biweekly | monthly | custom
    intervalDays: integer("interval_days"),
    enabled: boolean("enabled").notNull().default(true),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastAnalysisId: uuid("last_analysis_id").references(() => websiteAnalyses.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("monitor_schedules_website_idx").on(t.websiteId),
    index("monitor_schedules_workspace_idx").on(t.workspaceId),
    index("monitor_schedules_next_run_idx").on(t.nextRunAt),
  ],
);

export const scoreSnapshots = pgTable(
  "score_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    moneyGapScore: integer("money_gap_score").notNull().default(0),
    categoryScores: jsonb("category_scores").$type<CategoryScores>(),
    revenueAtRisk: integer("revenue_at_risk").notNull().default(0),
    capturePotential: integer("capture_potential").notNull().default(0),
    capturedOpportunity: integer("captured_opportunity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("score_snapshots_website_idx").on(t.websiteId),
    index("score_snapshots_report_idx").on(t.reportId),
    index("score_snapshots_created_idx").on(t.createdAt),
  ],
);

export type AnalysisComparisonChanges = {
  newOpportunities: { title: string; moduleId: string | null; opportunityIndex: number }[];
  resolved: { title: string; moduleId: string | null }[];
  categoryDeltas: Partial<Record<keyof CategoryScores, number>>;
  competitorNotes: string[];
  reasons: string[];
  crawlabilityDelta?: number | null;
  crawlabilityPrevious?: number | null;
  crawlabilityCurrent?: number | null;
};

export const analysisComparisons = pgTable(
  "analysis_comparisons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    previousReportId: uuid("previous_report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    currentReportId: uuid("current_report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    scoreDelta: integer("score_delta").notNull().default(0),
    summary: text("summary"),
    changes: jsonb("changes").$type<AnalysisComparisonChanges>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("analysis_comparisons_website_idx").on(t.websiteId),
    index("analysis_comparisons_current_idx").on(t.currentReportId),
  ],
);

export type GrowthBriefPayload = {
  whatChanged: string[];
  newOps: string[];
  completed: string[];
  priorities: string[];
  competitorUpdates: string[];
  nextSteps: string[];
};

export const growthBriefs = pgTable(
  "growth_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").$type<GrowthBriefPayload>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("growth_briefs_workspace_idx").on(t.workspaceId),
    index("growth_briefs_website_idx").on(t.websiteId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_workspace_idx").on(t.workspaceId),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

export type CompetitorSnapshotSignals = {
  content?: string[];
  products?: string[];
  offers?: string[];
  summary?: string | null;
};

export const competitorSnapshots = pgTable(
  "competitor_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    competitorId: uuid("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    signals: jsonb("signals").$type<CompetitorSnapshotSignals>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("competitor_snapshots_competitor_idx").on(t.competitorId),
    index("competitor_snapshots_website_idx").on(t.websiteId),
    index("competitor_snapshots_report_idx").on(t.reportId),
  ],
);

/** Phase 7: Agency Platform™ */
export const agencyBrandSettings = pgTable(
  "agency_brand_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    logoUrl: text("logo_url"),
    companyName: text("company_name"),
    primaryColor: text("primary_color"),
    accentColor: text("accent_color"),
    contactInfo: text("contact_info"),
    reportFooter: text("report_footer"),
    showPoweredBy: boolean("show_powered_by").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("agency_brand_workspace_idx").on(t.workspaceId)],
);

export type SharePermissions = {
  view: boolean;
  download: boolean;
  comment: boolean;
  approve: boolean;
};

export const clientShareLinks = pgTable(
  "client_share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    permissions: jsonb("permissions").$type<SharePermissions>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("client_share_links_client_idx").on(t.clientId),
    index("client_share_links_token_idx").on(t.token),
  ],
);

export const shareComments = pgTable(
  "share_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shareLinkId: uuid("share_link_id")
      .notNull()
      .references(() => clientShareLinks.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("share_comments_link_idx").on(t.shareLinkId)],
);

export const shareApprovals = pgTable(
  "share_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shareLinkId: uuid("share_link_id")
      .notNull()
      .references(() => clientShareLinks.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    decision: text("decision").notNull(), // approved | rejected
    note: text("note"),
    authorName: text("author_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("share_approvals_link_idx").on(t.shareLinkId)],
);

export const agencyTemplates = pgTable(
  "agency_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    modulePriority: jsonb("module_priority").$type<string[]>(),
    reportSections: jsonb("report_sections").$type<string[]>(),
    recommendationHints: text("recommendation_hints"),
    priorityNotes: text("priority_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("agency_templates_slug_idx").on(t.slug)],
);

export const clientReportSchedules = pgTable(
  "client_report_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    frequency: text("frequency").notNull().default("monthly"),
    // weekly | monthly | quarterly
    enabled: boolean("enabled").notNull().default(true),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("client_report_schedules_client_idx").on(t.clientId),
    index("client_report_schedules_next_run_idx").on(t.nextRunAt),
  ],
);

export const clientScheduledReports = pgTable(
  "client_scheduled_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("client_scheduled_reports_client_idx").on(t.clientId),
    index("client_scheduled_reports_workspace_idx").on(t.workspaceId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_workspace_idx").on(t.workspaceId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/** Phase 21: secure workspace invites (staff + Client role) */
export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_invites_workspace_idx").on(t.workspaceId),
    index("workspace_invites_token_idx").on(t.token),
    index("workspace_invites_email_idx").on(t.email),
  ],
);

/** Phase 21: internal opportunity discussion (≠ share_comments) */
export const opportunityComments = pgTable(
  "opportunity_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "set null",
    }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("opportunity_comments_workspace_idx").on(t.workspaceId),
    index("opportunity_comments_opportunity_idx").on(t.opportunityId),
    index("opportunity_comments_report_idx").on(t.reportId),
  ],
);

/** Phase 21: member-side approvals (≠ share_approvals) */
export const opportunityApprovals = pgTable(
  "opportunity_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "set null",
    }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    // pending | approved | rejected
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("opportunity_approvals_workspace_idx").on(t.workspaceId),
    index("opportunity_approvals_opportunity_idx").on(t.opportunityId),
    index("opportunity_approvals_client_idx").on(t.clientId),
  ],
);

/** Phase 8: Monetization Architecture */
export type PlanLimitsJson = {
  maxClients: number;
  maxSeats: number;
  maxWebsites: number;
  analysesPerMonth: number;
  aiGenerationsPerMonth: number;
  reportsPerMonth: number;
  competitorAnalysesPerMonth: number;
  exportsPerMonth: number;
  apiCallsPerMonth: number;
};

export type UsagePeriodCounters = {
  website_analysis: number;
  ai_generation: number;
  report_created: number;
  competitor_analysis: number;
  export: number;
  api_call: number;
};

export const billingPlans = pgTable(
  "billing_plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    monthlyPriceCents: integer("monthly_price_cents").notNull().default(0),
    annualPriceCents: integer("annual_price_cents").notNull().default(0),
    stripePriceMonthlyId: text("stripe_price_monthly_id"),
    stripePriceAnnualId: text("stripe_price_annual_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    limits: jsonb("limits").$type<PlanLimitsJson>().notNull(),
    features: jsonb("features").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const workspaceSubscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    planId: text("plan_id")
      .notNull()
      .references(() => billingPlans.id),
    status: text("status").notNull().default("active"),
    // trialing | active | past_due | canceled | incomplete
    billingInterval: text("billing_interval").notNull().default("monthly"),
    // monthly | annual
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("workspace_subscriptions_plan_idx").on(t.planId)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    // website_analysis | ai_generation | report_created | competitor_analysis | export | api_call
    quantity: integer("quantity").notNull().default(1),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("usage_events_workspace_idx").on(t.workspaceId),
    index("usage_events_type_idx").on(t.type),
    index("usage_events_created_idx").on(t.createdAt),
  ],
);

export const usagePeriods = pgTable(
  "usage_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    counters: jsonb("counters").$type<UsagePeriodCounters>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("usage_periods_workspace_idx").on(t.workspaceId),
    index("usage_periods_start_idx").on(t.periodStart),
  ],
);

export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id"),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("draft"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("billing_invoices_workspace_idx").on(t.workspaceId)],
);

/** Phase 10: MoneyGap API™ & Enterprise Intelligence™ */
export type ApiKeyScope = "analyze" | "read" | "webhooks";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    environment: text("environment").notNull().default("development"),
    // development | production
    scopes: jsonb("scopes").$type<ApiKeyScope[]>().notNull(),
    rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("api_keys_workspace_idx").on(t.workspaceId),
    index("api_keys_prefix_idx").on(t.keyPrefix),
  ],
);

export const apiRequestLogs = pgTable(
  "api_request_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    method: text("method").notNull(),
    path: text("path").notNull(),
    statusCode: integer("status_code").notNull(),
    errorCode: text("error_code"),
    durationMs: integer("duration_ms"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("api_request_logs_workspace_idx").on(t.workspaceId),
    index("api_request_logs_key_idx").on(t.apiKeyId),
    index("api_request_logs_created_idx").on(t.createdAt),
  ],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("webhook_endpoints_workspace_idx").on(t.workspaceId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"),
    // pending | delivered | failed
    responseStatus: integer("response_status"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("webhook_deliveries_workspace_idx").on(t.workspaceId),
    index("webhook_deliveries_endpoint_idx").on(t.endpointId),
  ],
);

export const enterpriseSettings = pgTable(
  "enterprise_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    ssoEnabled: boolean("sso_enabled").notNull().default(false),
    ssoProvider: text("sso_provider"),
    dataRetentionDays: integer("data_retention_days").notNull().default(365),
    dedicatedEnvironment: boolean("dedicated_environment").notNull().default(false),
    auditExportEnabled: boolean("audit_export_enabled").notNull().default(true),
    /** Phase 23: remind operators to enforce MFA in Clerk (not a TOTP server) */
    mfaRemindEnabled: boolean("mfa_remind_enabled").notNull().default(true),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("enterprise_settings_workspace_idx").on(t.workspaceId)],
);

/** Phase 11: anonymous product metrics (no PII) */
export const productMetricsEvents = pgTable(
  "product_metrics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    // report_created | gap_category_seen | project_completed | score_snapshot
    value: integer("value").notNull().default(1),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("product_metrics_type_idx").on(t.type),
    index("product_metrics_created_idx").on(t.createdAt),
  ],
);

/** Phase 12: MoneyGap Growth OS™ */
export type BusinessGoalType =
  | "leads"
  | "revenue"
  | "product"
  | "subscribers"
  | "seo"
  | "authority"
  | "conversions"
  | "custom";

export const businessGoals = pgTable(
  "business_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull().default("custom"),
    // leads | revenue | product | subscribers | seo | authority | conversions | custom
    targetValue: text("target_value"),
    status: text("status").notNull().default("active"),
    // active | paused | completed | archived
    priority: integer("priority").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("business_goals_workspace_idx").on(t.workspaceId),
    index("business_goals_status_idx").on(t.status),
  ],
);

export const goalLinks = pgTable(
  "goal_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => businessGoals.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("goal_links_goal_idx").on(t.goalId),
    index("goal_links_opportunity_idx").on(t.opportunityId),
    index("goal_links_project_idx").on(t.projectId),
  ],
);

export const projectDependencies = pgTable(
  "project_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => actionProjects.id, { onDelete: "cascade" }),
    dependsOnProjectId: uuid("depends_on_project_id")
      .notNull()
      .references(() => actionProjects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("project_deps_project_idx").on(t.projectId),
    index("project_deps_depends_idx").on(t.dependsOnProjectId),
  ],
);

export const growthAchievements = pgTable(
  "growth_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const workspaceAchievements = pgTable(
  "workspace_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => growthAchievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_achievements_workspace_idx").on(t.workspaceId),
    index("workspace_achievements_achievement_idx").on(t.achievementId),
  ],
);

export const growthTimelineEvents = pgTable(
  "growth_timeline_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    // analysis_started | project_completed | score_threshold | milestone | custom
    title: text("title").notNull(),
    body: text("body"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("growth_timeline_workspace_idx").on(t.workspaceId),
    index("growth_timeline_occurred_idx").on(t.occurredAt),
  ],
);

export const growthCalendarItems = pgTable(
  "growth_calendar_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    day: text("day").notNull(),
    // monday | tuesday | ... | sunday (or ISO date YYYY-MM-DD)
    weekStart: text("week_start").notNull(),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
    status: text("status").notNull().default("planned"),
    // planned | done | skipped
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("growth_calendar_workspace_idx").on(t.workspaceId),
    index("growth_calendar_week_idx").on(t.weekStart),
  ],
);

export const coachNudges = pgTable(
  "coach_nudges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    severity: text("severity").notNull().default("info"),
    // info | warn | celebrate
    message: text("message").notNull(),
    ctaLabel: text("cta_label"),
    ctaHref: text("cta_href"),
    dismissed: boolean("dismissed").notNull().default(false),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("coach_nudges_workspace_idx").on(t.workspaceId),
    index("coach_nudges_dismissed_idx").on(t.dismissed),
  ],
);

/** Phase 13: Knowledge Graph™ / Industry Intelligence™ */
export type KgIndustryBenchmarks = {
  expectedFeatures: string[];
  peerCategoryTargets?: Record<string, number>;
  notes?: string;
};

export type KgIndustryProfile = {
  revenueModels: string[];
  trustSignals: string[];
  marketingChannels: string[];
  websiteFeatures: string[];
  contentStrategy: string[];
  integrations: string[];
  growthPriorities: string[];
  description?: string;
  characteristics?: string[];
  commonGaps?: string[];
  conversionPatterns?: string[];
  seoExpectations?: string[];
  benchmarks?: KgIndustryBenchmarks;
};

export type IndustryGapSnapshot = {
  industrySlug: string;
  industryName: string;
  confidence: number;
  source: "auto" | "override";
  benchmarkSummary: string;
  missingCapabilities: {
    label: string;
    evidence?: string;
    moduleId?: string;
  }[];
  competitorPatterns: string[];
  priorityOpportunities: {
    title: string;
    opportunityId?: string;
    reason: string;
  }[];
  industryFitScore?: number;
};

/** Phase 13.3 Business Model Intelligence™ */
export type KgRevenueStage = {
  id: string;
  label: string;
  description?: string;
};

export type KgBusinessModelProfile = {
  revenueStructure: string[];
  customerJourney: string[];
  growthLevers: string[];
  commonGaps: string[];
  trustRequirements: string[];
  conversionPatterns: string[];
  retentionStrategies: string[];
  revenueStages: KgRevenueStage[];
  benchmarks?: {
    expectedCapabilities: string[];
    notes?: string;
  };
};

export type RevenueArchitectureStageStatus = "present" | "weak" | "missing";

export type RevenueArchitectureSnapshot = {
  businessModelSlug: string;
  businessModelName: string;
  stages: {
    id: string;
    label: string;
    description?: string;
    status: RevenueArchitectureStageStatus;
    evidence?: string;
  }[];
};

export type ModelEvidenceItem = {
  signal: string;
  weight: number;
};

export type BusinessModelGapSnapshot = {
  businessModelSlug: string;
  businessModelName: string;
  confidence: number;
  source: "auto" | "override";
  benchmarkSummary: string;
  missingCapabilities: {
    label: string;
    evidence?: string;
    moduleId?: string;
  }[];
  competitorPatterns: string[];
  priorityOpportunities: {
    title: string;
    opportunityId?: string;
    reason: string;
  }[];
  businessModelFitScore?: number;
  modelEvidence?: ModelEvidenceItem[];
};

/** Phase 13.4 Growth Pattern Library™ */
export type KgPatternCategory =
  | "revenue"
  | "acquisition"
  | "seo"
  | "authority"
  | "trust"
  | "conversion"
  | "retention"
  | "automation"
  | "ai_adoption";

export type KgPatternMaturity = "early" | "growth" | "scale";

export type KgPatternProfile = {
  applicableIndustries: string[];
  applicableBusinessModels: string[];
  requiredConditions: string[];
  maturityLevels: KgPatternMaturity[];
  goalTypes: string[];
  implementationSteps: { title: string; action: string; order: number }[];
  impactScore: number;
  revenuePotential: number;
  expectedOutcomes?: string[];
};

export type PatternRecommendation = {
  patternSlug: string;
  name: string;
  category: KgPatternCategory;
  confidence: number;
  reasoning: string[];
  impactScore: number;
  difficulty: string;
  revenuePotential: number;
  implementationSteps: { title: string; action: string; order: number }[];
};

export type PatternMatchSnapshot = {
  maturity: KgPatternMaturity;
  goalTypesUsed: string[];
  recommendations: PatternRecommendation[];
  matchedAt: string;
};

export type KgRuleConditions = {
  industry?: string;
  businessModel?: string;
  missingSignals?: string[];
  presentSignals?: string[];
};

export type KgRuleActions = {
  boostCategories?: string[];
  titleIncludes?: string[];
  moduleIds?: string[];
  priorityBoost?: number;
  severityNudge?: "critical" | "high" | "medium" | "low";
};

export type KgPlaybookStep = {
  title: string;
  action: string;
  patternSlug?: string;
  moduleId?: string;
  order: number;
};

/** Catalog entry lifecycle: active | draft | deprecated */
export type KgEntryStatus = "active" | "draft" | "deprecated";

export const kgIndustries = pgTable(
  "kg_industries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    profile: jsonb("profile").$type<KgIndustryProfile>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const kgBusinessModels = pgTable(
  "kg_business_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    typicalIndustries: jsonb("typical_industries").$type<string[]>().default([]),
    profile: jsonb("profile").$type<KgBusinessModelProfile>(),
    sortOrder: integer("sort_order").notNull().default(0),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const kgEntities = pgTable(
  "kg_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    // revenue_strategy | trust_signal | conversion_strategy | conversion_tactic |
    // marketing_channel | seo_strategy | automation_strategy | technology_pattern |
    // authority_signal | content_type | growth_opportunity | acquisition_method | retention_strategy
    description: text("description"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("kg_entities_type_idx").on(t.type)],
);

export const kgPatterns = pgTable(
  "kg_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    purpose: text("purpose").notNull(),
    category: text("category").$type<KgPatternCategory>(),
    description: text("description"),
    profile: jsonb("profile").$type<KgPatternProfile>(),
    outcomes: jsonb("outcomes").$type<string[]>().default([]),
    dependencies: jsonb("dependencies").$type<string[]>().default([]),
    difficulty: text("difficulty").notNull().default("medium"),
    roiEstimate: integer("roi_estimate").notNull().default(3),
    relatedEntitySlugs: jsonb("related_entity_slugs").$type<string[]>().default([]),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const kgRules = pgTable(
  "kg_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(50),
    conditions: jsonb("conditions").$type<KgRuleConditions>().notNull(),
    actions: jsonb("actions").$type<KgRuleActions>().notNull(),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("kg_rules_enabled_idx").on(t.enabled)],
);

export const kgPlaybooks = pgTable(
  "kg_playbooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    industrySlug: text("industry_slug").notNull(),
    businessModelSlug: text("business_model_slug"),
    name: text("name").notNull(),
    steps: jsonb("steps").$type<KgPlaybookStep[]>().notNull(),
    patternSlugs: jsonb("pattern_slugs").$type<string[]>().default([]),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("kg_playbooks_industry_idx").on(t.industrySlug)],
);

export const kgRecommendations = pgTable(
  "kg_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    industrySlug: text("industry_slug"),
    businessModelSlug: text("business_model_slug"),
    patternSlug: text("pattern_slug"),
    moduleId: text("module_id"),
    priority: integer("priority").notNull().default(50),
    version: text("version").notNull().default("1.0.0"),
    status: text("status").$type<KgEntryStatus>().notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("kg_recommendations_industry_idx").on(t.industrySlug),
    index("kg_recommendations_status_idx").on(t.status),
  ],
);

export const kgVersions = pgTable(
  "kg_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: text("version").notNull().unique(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const websiteClassifications = pgTable(
  "website_classifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => websiteAnalyses.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }),
    industrySlug: text("industry_slug"),
    businessModelSlug: text("business_model_slug"),
    confidence: integer("confidence").notNull().default(50),
    signals: jsonb("signals").$type<string[]>().default([]),
    modelEvidence: jsonb("model_evidence").$type<ModelEvidenceItem[]>().default([]),
    source: text("source").notNull().default("auto"),
    // auto | override
    overrideIndustrySlug: text("override_industry_slug"),
    overrideBusinessModelSlug: text("override_business_model_slug"),
    overriddenAt: timestamp("overridden_at", { withTimezone: true }),
    overriddenByUserId: text("overridden_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("website_classifications_analysis_idx").on(t.analysisId),
    index("website_classifications_report_idx").on(t.reportId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  memberships: many(workspaceMembers),
  analyses: many(websiteAnalyses),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [workspaceMembers.clientId],
    references: [clients.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  websites: many(websites),
  reports: many(reports),
  analyses: many(websiteAnalyses),
  growthBriefs: many(growthBriefs),
  notifications: many(notifications),
  clients: many(clients),
  brandSettings: many(agencyBrandSettings),
  auditLogs: many(auditLogs),
  subscription: many(workspaceSubscriptions),
  usageEvents: many(usageEvents),
  usagePeriods: many(usagePeriods),
  invoices: many(billingInvoices),
  apiKeys: many(apiKeys),
  apiRequestLogs: many(apiRequestLogs),
  webhookEndpoints: many(webhookEndpoints),
  enterpriseSettings: many(enterpriseSettings),
  businessGoals: many(businessGoals),
  growthTimelineEvents: many(growthTimelineEvents),
  growthCalendarItems: many(growthCalendarItems),
  coachNudges: many(coachNudges),
  workspaceAchievements: many(workspaceAchievements),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [apiKeys.workspaceId],
    references: [workspaces.id],
  }),
  logs: many(apiRequestLogs),
}));

export const apiRequestLogsRelations = relations(apiRequestLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [apiRequestLogs.workspaceId],
    references: [workspaces.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiRequestLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [webhookEndpoints.workspaceId],
    references: [workspaces.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
  workspace: one(workspaces, {
    fields: [webhookDeliveries.workspaceId],
    references: [workspaces.id],
  }),
}));

export const enterpriseSettingsRelations = relations(enterpriseSettings, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [enterpriseSettings.workspaceId],
    references: [workspaces.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
  assignee: one(users, {
    fields: [clients.assignedUserId],
    references: [users.id],
  }),
  websites: many(websites),
  shareLinks: many(clientShareLinks),
  reportSchedules: many(clientReportSchedules),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [websites.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [websites.clientId],
    references: [clients.id],
  }),
  reports: many(reports),
  metrics: many(dailyMetrics),
  competitors: many(competitors),
  analysisJobs: many(analysisJobs),
  analyses: many(websiteAnalyses),
  monitorSchedules: many(monitorSchedules),
  scoreSnapshots: many(scoreSnapshots),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  website: one(websites, { fields: [reports.websiteId], references: [websites.id] }),
  workspace: one(workspaces, {
    fields: [reports.workspaceId],
    references: [workspaces.id],
  }),
  moneyGaps: many(moneyGaps),
  moneyGapOpportunities: many(moneyGapOpportunities),
  competitors: many(competitors),
  actionProjects: many(actionProjects),
  generatedAssets: many(generatedAssets),
  advisorMessages: many(advisorMessages),
  businessProfile: one(businessProfiles, {
    fields: [reports.id],
    references: [businessProfiles.reportId],
  }),
  audienceProfile: one(audienceProfiles, {
    fields: [reports.id],
    references: [audienceProfiles.reportId],
  }),
  contentAnalysis: one(contentAnalyses, {
    fields: [reports.id],
    references: [contentAnalyses.reportId],
  }),
  insights: many(websiteInsights),
  analysis: one(websiteAnalyses, {
    fields: [reports.id],
    references: [websiteAnalyses.reportId],
  }),
}));

export const moneyGapsRelations = relations(moneyGaps, ({ one }) => ({
  report: one(reports, { fields: [moneyGaps.reportId], references: [reports.id] }),
}));

export const moneyGapOpportunitiesRelations = relations(moneyGapOpportunities, ({ one, many }) => ({
  report: one(reports, {
    fields: [moneyGapOpportunities.reportId],
    references: [reports.id],
  }),
  analysis: one(websiteAnalyses, {
    fields: [moneyGapOpportunities.analysisId],
    references: [websiteAnalyses.id],
  }),
  projects: many(actionProjects),
}));

export const actionProjectsRelations = relations(actionProjects, ({ one, many }) => ({
  report: one(reports, {
    fields: [actionProjects.reportId],
    references: [reports.id],
  }),
  opportunity: one(moneyGapOpportunities, {
    fields: [actionProjects.opportunityId],
    references: [moneyGapOpportunities.id],
  }),
  user: one(users, {
    fields: [actionProjects.userId],
    references: [users.id],
  }),
  tasks: many(actionProjectTasks),
  assets: many(generatedAssets),
}));

export const actionProjectTasksRelations = relations(actionProjectTasks, ({ one }) => ({
  project: one(actionProjects, {
    fields: [actionProjectTasks.projectId],
    references: [actionProjects.id],
  }),
}));

export const generatedAssetsRelations = relations(generatedAssets, ({ one }) => ({
  report: one(reports, {
    fields: [generatedAssets.reportId],
    references: [reports.id],
  }),
  opportunity: one(moneyGapOpportunities, {
    fields: [generatedAssets.opportunityId],
    references: [moneyGapOpportunities.id],
  }),
  project: one(actionProjects, {
    fields: [generatedAssets.projectId],
    references: [actionProjects.id],
  }),
}));

export const advisorMessagesRelations = relations(advisorMessages, ({ one }) => ({
  report: one(reports, {
    fields: [advisorMessages.reportId],
    references: [reports.id],
  }),
  user: one(users, {
    fields: [advisorMessages.userId],
    references: [users.id],
  }),
}));

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  website: one(websites, {
    fields: [competitors.websiteId],
    references: [websites.id],
  }),
  report: one(reports, {
    fields: [competitors.reportId],
    references: [reports.id],
  }),
  analysis: one(websiteAnalyses, {
    fields: [competitors.analysisId],
    references: [websiteAnalyses.id],
  }),
  snapshots: many(competitorSnapshots),
}));

export const monitorSchedulesRelations = relations(monitorSchedules, ({ one }) => ({
  website: one(websites, {
    fields: [monitorSchedules.websiteId],
    references: [websites.id],
  }),
  workspace: one(workspaces, {
    fields: [monitorSchedules.workspaceId],
    references: [workspaces.id],
  }),
}));

export const scoreSnapshotsRelations = relations(scoreSnapshots, ({ one }) => ({
  website: one(websites, {
    fields: [scoreSnapshots.websiteId],
    references: [websites.id],
  }),
  report: one(reports, {
    fields: [scoreSnapshots.reportId],
    references: [reports.id],
  }),
}));

export const analysisComparisonsRelations = relations(analysisComparisons, ({ one }) => ({
  website: one(websites, {
    fields: [analysisComparisons.websiteId],
    references: [websites.id],
  }),
  currentReport: one(reports, {
    fields: [analysisComparisons.currentReportId],
    references: [reports.id],
  }),
}));

export const growthBriefsRelations = relations(growthBriefs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [growthBriefs.workspaceId],
    references: [workspaces.id],
  }),
  website: one(websites, {
    fields: [growthBriefs.websiteId],
    references: [websites.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));

export const competitorSnapshotsRelations = relations(competitorSnapshots, ({ one }) => ({
  competitor: one(competitors, {
    fields: [competitorSnapshots.competitorId],
    references: [competitors.id],
  }),
  website: one(websites, {
    fields: [competitorSnapshots.websiteId],
    references: [websites.id],
  }),
  report: one(reports, {
    fields: [competitorSnapshots.reportId],
    references: [reports.id],
  }),
}));

export const websiteAnalysesRelations = relations(websiteAnalyses, ({ one, many }) => ({
  user: one(users, { fields: [websiteAnalyses.userId], references: [users.id] }),
  workspace: one(workspaces, {
    fields: [websiteAnalyses.workspaceId],
    references: [workspaces.id],
  }),
  website: one(websites, {
    fields: [websiteAnalyses.websiteId],
    references: [websites.id],
  }),
  report: one(reports, {
    fields: [websiteAnalyses.reportId],
    references: [reports.id],
  }),
  pages: many(websitePages),
  businessProfile: one(businessProfiles),
  audienceProfile: one(audienceProfiles),
  contentAnalysis: one(contentAnalyses),
  insights: many(websiteInsights),
  opportunities: many(moneyGapOpportunities),
}));

export const websitePagesRelations = relations(websitePages, ({ one }) => ({
  analysis: one(websiteAnalyses, {
    fields: [websitePages.analysisId],
    references: [websiteAnalyses.id],
  }),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  analysis: one(websiteAnalyses, {
    fields: [businessProfiles.analysisId],
    references: [websiteAnalyses.id],
  }),
  report: one(reports, {
    fields: [businessProfiles.reportId],
    references: [reports.id],
  }),
}));

export const audienceProfilesRelations = relations(audienceProfiles, ({ one }) => ({
  analysis: one(websiteAnalyses, {
    fields: [audienceProfiles.analysisId],
    references: [websiteAnalyses.id],
  }),
  report: one(reports, {
    fields: [audienceProfiles.reportId],
    references: [reports.id],
  }),
}));

export const contentAnalysesRelations = relations(contentAnalyses, ({ one }) => ({
  analysis: one(websiteAnalyses, {
    fields: [contentAnalyses.analysisId],
    references: [websiteAnalyses.id],
  }),
  report: one(reports, {
    fields: [contentAnalyses.reportId],
    references: [reports.id],
  }),
}));

export const websiteInsightsRelations = relations(websiteInsights, ({ one }) => ({
  analysis: one(websiteAnalyses, {
    fields: [websiteInsights.analysisId],
    references: [websiteAnalyses.id],
  }),
  report: one(reports, {
    fields: [websiteInsights.reportId],
    references: [reports.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Website = typeof websites.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type MoneyGap = typeof moneyGaps.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type WebsiteAnalysis = typeof websiteAnalyses.$inferSelect;
export type WebsitePage = typeof websitePages.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type AudienceProfile = typeof audienceProfiles.$inferSelect;
export type ContentAnalysis = typeof contentAnalyses.$inferSelect;
export type WebsiteInsight = typeof websiteInsights.$inferSelect;
export type MoneyGapOpportunity = typeof moneyGapOpportunities.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type ActionProject = typeof actionProjects.$inferSelect;
export type ActionProjectTask = typeof actionProjectTasks.$inferSelect;
export type GeneratedAsset = typeof generatedAssets.$inferSelect;
export type AdvisorMessage = typeof advisorMessages.$inferSelect;
export type BusinessGoal = typeof businessGoals.$inferSelect;
export type GoalLink = typeof goalLinks.$inferSelect;
export type ProjectDependency = typeof projectDependencies.$inferSelect;
export type GrowthAchievement = typeof growthAchievements.$inferSelect;
export type WorkspaceAchievement = typeof workspaceAchievements.$inferSelect;
export type GrowthTimelineEvent = typeof growthTimelineEvents.$inferSelect;
export type GrowthCalendarItem = typeof growthCalendarItems.$inferSelect;
export type CoachNudge = typeof coachNudges.$inferSelect;
export type KgIndustry = typeof kgIndustries.$inferSelect;
export type KgBusinessModel = typeof kgBusinessModels.$inferSelect;
export type KgEntity = typeof kgEntities.$inferSelect;
export type KgPattern = typeof kgPatterns.$inferSelect;
export type KgRule = typeof kgRules.$inferSelect;
export type KgPlaybook = typeof kgPlaybooks.$inferSelect;
export type KgRecommendation = typeof kgRecommendations.$inferSelect;
export type WebsiteClassification = typeof websiteClassifications.$inferSelect;

/** Phase 14 — MoneyGap Integration Hub™ */
export type IntegrationCategory =
  | "analytics"
  | "crm"
  | "email"
  | "cms"
  | "developer"
  | "hosting"
  | "payments"
  | "automation";

export type IntegrationAuthType = "oauth2" | "api_key" | "none";

export type IntegrationProviderStatus = "available" | "coming_soon" | "deprecated";

export type IntegrationConnectionStatus =
  | "connected"
  | "error"
  | "disconnected"
  | "pending";

export type NormalizedIntegrationData = {
  provider: string;
  category: IntegrationCategory;
  metrics?: Record<string, number | string>;
  entities?: { type: string; label: string; id?: string }[];
  freshness: string | null;
  warnings: string[];
};

export type IntegrationHealthSnapshot = {
  score: number;
  connectedCount: number;
  staleCount: number;
  errorCount: number;
  missingCritical: string[];
  evaluatedAt: string;
};

export type IntegrationCredentialPayload = {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
  extra?: Record<string, string>;
};

export const integrationProviders = pgTable(
  "integration_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").$type<IntegrationCategory>().notNull(),
    authType: text("auth_type").$type<IntegrationAuthType>().notNull().default("api_key"),
    scopes: jsonb("scopes").$type<string[]>().default([]),
    status: text("status")
      .$type<IntegrationProviderStatus>()
      .notNull()
      .default("available"),
    description: text("description"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("integration_providers_category_idx").on(t.category),
    index("integration_providers_status_idx").on(t.status),
  ],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    providerSlug: text("provider_slug").notNull(),
    status: text("status")
      .$type<IntegrationConnectionStatus>()
      .notNull()
      .default("pending"),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    healthScore: integer("health_score"),
    normalizedSnapshot: jsonb("normalized_snapshot").$type<NormalizedIntegrationData | null>(),
    connectedByUserId: text("connected_by_user_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("integration_connections_workspace_idx").on(t.workspaceId),
    index("integration_connections_provider_idx").on(t.providerSlug),
    uniqueIndex("integration_connections_workspace_provider_uidx").on(
      t.workspaceId,
      t.providerSlug,
    ),
  ],
);

export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" })
      .unique(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const integrationAuditLogs = pgTable(
  "integration_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    providerSlug: text("provider_slug"),
    connectionId: uuid("connection_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("integration_audit_logs_workspace_idx").on(t.workspaceId),
    index("integration_audit_logs_created_idx").on(t.createdAt),
  ],
);

export type IntegrationProvider = typeof integrationProviders.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;
export type IntegrationAuditLog = typeof integrationAuditLogs.$inferSelect;

export const integrationConnectionsRelations = relations(
  integrationConnections,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [integrationConnections.workspaceId],
      references: [workspaces.id],
    }),
    credentials: one(integrationCredentials, {
      fields: [integrationConnections.id],
      references: [integrationCredentials.connectionId],
    }),
  }),
);

export const integrationCredentialsRelations = relations(
  integrationCredentials,
  ({ one }) => ({
    connection: one(integrationConnections, {
      fields: [integrationCredentials.connectionId],
      references: [integrationConnections.id],
    }),
  }),
);

export const integrationAuditLogsRelations = relations(
  integrationAuditLogs,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [integrationAuditLogs.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

/** Phase 15 — Developer Mode™ & Stack Intelligence™ */

export type TechStackProfile = {
  frontend?: string | null;
  backend?: string | null;
  database?: string | null;
  orm?: string | null;
  auth?: string | null;
  hosting?: string | null;
  styling?: string | null;
  analytics?: string | null;
  payments?: string | null;
  email?: string | null;
  ai?: string | null;
  evidence: string[];
  confidence: number;
};

export type ImplementationPlanJson = {
  summary: string;
  filesCreate: string[];
  filesUpdate: string[];
  componentsReuse: string[];
  estimatedTime: string;
  riskLevel: "low" | "medium" | "high";
  riskSummary: string;
  dependencies: string[];
  validationChecklist: string[];
  testingSteps: string[];
  rollbackSteps: string[];
  stackNotes?: string;
};

export type DeveloperBlueprintTool =
  | "cursor"
  | "lovable"
  | "bolt"
  | "chatgpt"
  | "claude"
  | "gemini"
  | "copilot"
  | "windsurf";

export type DeveloperRepoStatus = "synced" | "analyzed" | "error" | "stale";
export type DeveloperPlanStatus = "draft" | "ready" | "archived";
export type DeveloperPrDraftStatus = "drafted" | "open" | "failed";

export const developerRepos = pgTable(
  "developer_repos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("github"),
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    htmlUrl: text("html_url"),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: text("status")
      .$type<DeveloperRepoStatus>()
      .notNull()
      .default("synced"),
    lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_repos_workspace_idx").on(t.workspaceId),
    uniqueIndex("developer_repos_workspace_fullname_uidx").on(t.workspaceId, t.fullName),
  ],
);

export const workspaceTechProfiles = pgTable(
  "workspace_tech_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    sourceRepoId: uuid("source_repo_id").references(() => developerRepos.id, {
      onDelete: "set null",
    }),
    stack: jsonb("stack").$type<TechStackProfile>().notNull(),
    confidence: integer("confidence").notNull().default(0),
    version: text("version").notNull().default("1.0.0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("workspace_tech_profiles_workspace_idx").on(t.workspaceId)],
);

export const developerImplementationPlans = pgTable(
  "developer_implementation_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    repoId: uuid("repo_id").references(() => developerRepos.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    plan: jsonb("plan").$type<ImplementationPlanJson>().notNull(),
    status: text("status")
      .$type<DeveloperPlanStatus>()
      .notNull()
      .default("draft"),
    createdByUserId: text("created_by_user_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_implementation_plans_workspace_idx").on(t.workspaceId),
    index("developer_implementation_plans_opportunity_idx").on(t.opportunityId),
  ],
);

export const developerBlueprints = pgTable(
  "developer_blueprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => developerImplementationPlans.id, { onDelete: "cascade" }),
    tool: text("tool").$type<DeveloperBlueprintTool>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_blueprints_plan_idx").on(t.planId),
    uniqueIndex("developer_blueprints_plan_tool_uidx").on(t.planId, t.tool),
  ],
);

export const developerPrDrafts = pgTable(
  "developer_pr_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => developerImplementationPlans.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => developerRepos.id, { onDelete: "cascade" }),
    branchName: text("branch_name").notNull(),
    prUrl: text("pr_url"),
    prNumber: integer("pr_number"),
    status: text("status")
      .$type<DeveloperPrDraftStatus>()
      .notNull()
      .default("drafted"),
    riskSummary: text("risk_summary"),
    authorizedByUserId: text("authorized_by_user_id").notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }).notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_pr_drafts_workspace_idx").on(t.workspaceId),
    index("developer_pr_drafts_plan_idx").on(t.planId),
  ],
);

export const developerAuditLogs = pgTable(
  "developer_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    repoId: uuid("repo_id"),
    planId: uuid("plan_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_audit_logs_workspace_idx").on(t.workspaceId),
    index("developer_audit_logs_created_idx").on(t.createdAt),
  ],
);

export type DeveloperRepo = typeof developerRepos.$inferSelect;
export type WorkspaceTechProfile = typeof workspaceTechProfiles.$inferSelect;
export type DeveloperImplementationPlan =
  typeof developerImplementationPlans.$inferSelect;
export type DeveloperBlueprint = typeof developerBlueprints.$inferSelect;
export type DeveloperPrDraft = typeof developerPrDrafts.$inferSelect;
export type DeveloperAuditLog = typeof developerAuditLogs.$inferSelect;

export const developerReposRelations = relations(developerRepos, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [developerRepos.workspaceId],
    references: [workspaces.id],
  }),
}));

export const workspaceTechProfilesRelations = relations(
  workspaceTechProfiles,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceTechProfiles.workspaceId],
      references: [workspaces.id],
    }),
    sourceRepo: one(developerRepos, {
      fields: [workspaceTechProfiles.sourceRepoId],
      references: [developerRepos.id],
    }),
  }),
);

export const developerImplementationPlansRelations = relations(
  developerImplementationPlans,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [developerImplementationPlans.workspaceId],
      references: [workspaces.id],
    }),
    repo: one(developerRepos, {
      fields: [developerImplementationPlans.repoId],
      references: [developerRepos.id],
    }),
    blueprints: many(developerBlueprints),
    prDrafts: many(developerPrDrafts),
  }),
);

export const developerBlueprintsRelations = relations(
  developerBlueprints,
  ({ one }) => ({
    plan: one(developerImplementationPlans, {
      fields: [developerBlueprints.planId],
      references: [developerImplementationPlans.id],
    }),
  }),
);

export const developerPrDraftsRelations = relations(developerPrDrafts, ({ one }) => ({
  plan: one(developerImplementationPlans, {
    fields: [developerPrDrafts.planId],
    references: [developerImplementationPlans.id],
  }),
  repo: one(developerRepos, {
    fields: [developerPrDrafts.repoId],
    references: [developerRepos.id],
  }),
}));

/** Phase 16 — Confidence Center™ history */

export type ConfidenceSnapshotBreakdown = {
  engines: {
    business: number;
    developer: number;
    data: number;
    benchmark: number;
    ai: number;
  };
  riskDistribution?: { low: number; medium: number; high: number };
  recommendationCount?: number;
};

export const workspaceConfidenceSnapshots = pgTable(
  "workspace_confidence_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    overallScore: integer("overall_score").notNull().default(0),
    breakdown: jsonb("breakdown").$type<ConfidenceSnapshotBreakdown>().notNull(),
    lowConfidenceCount: integer("low_confidence_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_confidence_snapshots_workspace_idx").on(t.workspaceId),
    index("workspace_confidence_snapshots_created_idx").on(t.createdAt),
  ],
);

export type WorkspaceConfidenceSnapshot =
  typeof workspaceConfidenceSnapshots.$inferSelect;

export const workspaceConfidenceSnapshotsRelations = relations(
  workspaceConfidenceSnapshots,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceConfidenceSnapshots.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

/** Phase 17 — MoneyGap Automation Engine™ & AI Workforce™ */

export type AutomationWorkflowKind =
  | "crm"
  | "email"
  | "nurture"
  | "onboarding"
  | "reviews"
  | "internal";

export type AutomationWorkflowStatus = "draft" | "active" | "archived";
export type AutomationQueueStatus = "queued" | "in_progress" | "done" | "dismissed";
export type AutomationQueueSource = "priority" | "monitor" | "manual";
export type AutomationSprintStatus = "planned" | "active" | "completed" | "archived";
export type AutomationAgentStatus = "active" | "disabled";

export type AutomationWorkflowStep = {
  id: string;
  title: string;
  detail: string;
  ownerHint?: string;
};

export type AutomationWorkflowSteps = {
  kind: AutomationWorkflowKind;
  steps: AutomationWorkflowStep[];
  summary: string;
};

export type AutomationSprintPlan = {
  opportunityIds: string[];
  queueItemIds: string[];
  focus: string[];
  notes?: string;
};

export type ExecutiveBriefingPayload = {
  progressSummary: string;
  growthScore: number | null;
  topPriorities: {
    id: string;
    title: string;
    overall?: number;
    websiteId?: string | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  }[];
  completed: {
    id: string;
    title: string;
    websiteId?: string | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  }[];
  recommendations: {
    id: string;
    title: string;
    moduleId?: string;
    websiteId?: string | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  }[];
  automationHealth: {
    queueDepth: number;
    workflowDrafts: number;
    workflowRuns: number;
    activeSprint: string | null;
  };
  monitorBriefSnippet?: string | null;
  focusWebsite?: { id: string; name: string; domain: string } | null;
};

export const automationAgents = pgTable(
  "automation_agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    moduleIds: jsonb("module_ids").$type<string[]>().notNull().default([]),
    description: text("description"),
    status: text("status")
      .$type<AutomationAgentStatus>()
      .notNull()
      .default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("automation_agents_status_idx").on(t.status)],
);

export const automationWorkflows = pgTable(
  "automation_workflows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => moneyGapOpportunities.id, {
      onDelete: "set null",
    }),
    agentSlug: text("agent_slug").notNull(),
    title: text("title").notNull(),
    kind: text("kind").$type<AutomationWorkflowKind>().notNull().default("internal"),
    steps: jsonb("steps").$type<AutomationWorkflowSteps>().notNull(),
    status: text("status")
      .$type<AutomationWorkflowStatus>()
      .notNull()
      .default("draft"),
    projectId: uuid("project_id").references(() => actionProjects.id, {
      onDelete: "set null",
    }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("automation_workflows_workspace_idx").on(t.workspaceId),
    index("automation_workflows_status_idx").on(t.status),
  ],
);

export const automationWorkflowRuns = pgTable(
  "automation_workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => automationWorkflows.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("completed"),
    summary: text("summary"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("automation_workflow_runs_workflow_idx").on(t.workflowId)],
);

export const automationSprints = pgTable(
  "automation_sprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    goalSummary: text("goal_summary"),
    status: text("status")
      .$type<AutomationSprintStatus>()
      .notNull()
      .default("planned"),
    plan: jsonb("plan").$type<AutomationSprintPlan>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("automation_sprints_workspace_idx").on(t.workspaceId)],
);

export const automationQueueItems = pgTable(
  "automation_queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => moneyGapOpportunities.id, { onDelete: "cascade" }),
    agentSlug: text("agent_slug"),
    priority: integer("priority").notNull().default(50),
    status: text("status")
      .$type<AutomationQueueStatus>()
      .notNull()
      .default("queued"),
    source: text("source")
      .$type<AutomationQueueSource>()
      .notNull()
      .default("priority"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("automation_queue_items_workspace_idx").on(t.workspaceId),
    uniqueIndex("automation_queue_items_workspace_opp_uidx").on(
      t.workspaceId,
      t.opportunityId,
    ),
  ],
);

export const automationMarketplaceTemplates = pgTable(
  "automation_marketplace_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").$type<AutomationWorkflowKind>().notNull(),
    agentSlug: text("agent_slug").notNull(),
    description: text("description"),
    steps: jsonb("steps").$type<AutomationWorkflowSteps>().notNull(),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const executiveBriefings = pgTable(
  "executive_briefings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    payload: jsonb("payload").$type<ExecutiveBriefingPayload>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("executive_briefings_workspace_idx").on(t.workspaceId),
    index("executive_briefings_created_idx").on(t.createdAt),
  ],
);

export type AutomationAgent = typeof automationAgents.$inferSelect;
export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type AutomationWorkflowRun = typeof automationWorkflowRuns.$inferSelect;
export type AutomationSprint = typeof automationSprints.$inferSelect;
export type AutomationQueueItem = typeof automationQueueItems.$inferSelect;
export type AutomationMarketplaceTemplate =
  typeof automationMarketplaceTemplates.$inferSelect;
export type ExecutiveBriefing = typeof executiveBriefings.$inferSelect;

export const automationWorkflowsRelations = relations(
  automationWorkflows,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [automationWorkflows.workspaceId],
      references: [workspaces.id],
    }),
    runs: many(automationWorkflowRuns),
  }),
);

export const automationWorkflowRunsRelations = relations(
  automationWorkflowRuns,
  ({ one }) => ({
    workflow: one(automationWorkflows, {
      fields: [automationWorkflowRuns.workflowId],
      references: [automationWorkflows.id],
    }),
  }),
);

export const automationQueueItemsRelations = relations(
  automationQueueItems,
  ({ one }) => ({
    opportunity: one(moneyGapOpportunities, {
      fields: [automationQueueItems.opportunityId],
      references: [moneyGapOpportunities.id],
    }),
  }),
);

/* ─── Phase 19 — Growth Copilot™ ─── */

export type BusinessMemoryKind =
  | "fact"
  | "preference"
  | "decision"
  | "open_question";

export type CopilotMode = "ceo" | "marketing" | "developer" | "agency";

export type ConciergeProposedAction = {
  type: "navigate" | "open_report" | "recommend_fix_path";
  label: string;
  href: string;
  requiresConfirmation: boolean;
};

export type CopilotMessageMeta = {
  evidence?: string[];
  confidence?: number | null;
  fixPathId?: string | null;
  requiresApproval?: boolean;
  citations?: string[];
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
  /** Verified | Recommendation | AI Estimate */
  safetyLabels?: string[];
  proposedActions?: ConciergeProposedAction[];
};

export type DecisionSimulationResult = {
  scores: { label: string; score: number; notes: string }[];
  recommendation: string;
  evidence: string[];
  confidence: number;
  fixPathId?: string | null;
  requiresApproval: boolean;
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

export type CopilotPlanPayload = {
  summary: string;
  priorities: string[];
  roadmap: { title: string; horizon: string; steps: string[] }[];
  estimatesLabeled: "AI Estimate";
  evidence: string[];
  confidence: number;
  fixPathHints?: string[];
  websiteId?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

export const businessMemoryEntries = pgTable(
  "business_memory_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").$type<BusinessMemoryKind>().notNull(),
    key: text("key").notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    source: text("source").notNull().default("user"),
    confidence: integer("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("business_memory_entries_workspace_idx").on(t.workspaceId),
    index("business_memory_entries_kind_idx").on(t.kind),
  ],
);

export const copilotThreads = pgTable(
  "copilot_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").$type<CopilotMode>().notNull().default("ceo"),
    title: text("title").notNull().default("Ask MoneyGap"),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("copilot_threads_workspace_idx").on(t.workspaceId),
    index("copilot_threads_user_idx").on(t.userId),
  ],
);

export const copilotMessages = pgTable(
  "copilot_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => copilotThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull(),
    meta: jsonb("meta").$type<CopilotMessageMeta>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("copilot_messages_thread_idx").on(t.threadId)],
);

export const decisionSimulations = pgTable(
  "decision_simulations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    options: jsonb("options")
      .$type<{ label: string; description?: string }[]>()
      .notNull(),
    criteria: jsonb("criteria").$type<string[]>().notNull().default([]),
    result: jsonb("result").$type<DecisionSimulationResult>(),
    status: text("status").notNull().default("draft"), // draft | approved
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("decision_simulations_workspace_idx").on(t.workspaceId)],
);

export const copilotPlans = pgTable(
  "copilot_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    // growth | priority | quarterly | roadmap | weekly_report | monthly_report | client_report
    horizon: text("horizon"),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<CopilotPlanPayload>().notNull(),
    status: text("status").notNull().default("draft"),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("copilot_plans_workspace_idx").on(t.workspaceId),
    index("copilot_plans_kind_idx").on(t.kind),
  ],
);

export type BusinessMemoryEntry = typeof businessMemoryEntries.$inferSelect;
export type CopilotThread = typeof copilotThreads.$inferSelect;
export type CopilotMessage = typeof copilotMessages.$inferSelect;
export type DecisionSimulation = typeof decisionSimulations.$inferSelect;
export type CopilotPlan = typeof copilotPlans.$inferSelect;

export const copilotThreadsRelations = relations(
  copilotThreads,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [copilotThreads.workspaceId],
      references: [workspaces.id],
    }),
    messages: many(copilotMessages),
  }),
);

export const copilotMessagesRelations = relations(copilotMessages, ({ one }) => ({
  thread: one(copilotThreads, {
    fields: [copilotMessages.threadId],
    references: [copilotThreads.id],
  }),
}));

export const businessMemoryEntriesRelations = relations(
  businessMemoryEntries,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [businessMemoryEntries.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

/* ─── Phase 20 — Predictive Intelligence™ ─── */

export type PredictionKind =
  | "growth"
  | "revenue"
  | "seo_trend"
  | "competitive_movement"
  | "business_risk"
  | "opportunity"
  | "market_signal";

export type PredictionHorizon = "7d" | "30d" | "90d";

export type PredictionImpactEstimate = {
  labeled: "AI Estimate";
  summary: string;
  scoreDelta?: number;
  revenueDelta?: number;
};

export type WhatIfInputs = {
  conversionLiftPct: number;
  trafficGrowthPct: number;
  pricingChangePct: number;
  contentProductionBoostPct: number;
  automationAdoptionPct: number;
};

export type WhatIfResult = {
  labeled: "AI Estimate";
  horizons: {
    horizon: PredictionHorizon;
    projectedScoreDelta: number;
    projectedRevenueDelta: number;
    summary: string;
  }[];
  evidence: string[];
  confidence: number;
  recommendedAction: string;
};

export const workspacePredictions = pgTable(
  "workspace_predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    kind: text("kind").$type<PredictionKind>().notNull(),
    title: text("title").notNull(),
    prediction: text("prediction").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    confidence: integer("confidence").notNull().default(50),
    horizon: text("horizon").$type<PredictionHorizon>().notNull().default("30d"),
    recommendedAction: text("recommended_action").notNull(),
    impactEstimate: jsonb("impact_estimate").$type<PredictionImpactEstimate>(),
    status: text("status").notNull().default("open"), // open | dismissed | acted
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_predictions_workspace_idx").on(t.workspaceId),
    index("workspace_predictions_kind_idx").on(t.kind),
    index("workspace_predictions_status_idx").on(t.status),
  ],
);

export const whatIfScenarios = pgTable(
  "what_if_scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("What-If scenario"),
    inputs: jsonb("inputs").$type<WhatIfInputs>().notNull(),
    result: jsonb("result").$type<WhatIfResult>().notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("what_if_scenarios_workspace_idx").on(t.workspaceId)],
);

export const predictiveAlertRules = pgTable(
  "predictive_alert_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").$type<PredictionKind>().notNull(),
    threshold: jsonb("threshold").$type<Record<string, unknown>>().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("predictive_alert_rules_workspace_idx").on(t.workspaceId)],
);

export type WorkspacePrediction = typeof workspacePredictions.$inferSelect;
export type WhatIfScenario = typeof whatIfScenarios.$inferSelect;
export type PredictiveAlertRule = typeof predictiveAlertRules.$inferSelect;

/* ─── Phase 21 — Team Workspace™ relations ─── */

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvites.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [workspaceInvites.clientId],
    references: [clients.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvites.invitedByUserId],
    references: [users.id],
  }),
}));

export const opportunityCommentsRelations = relations(
  opportunityComments,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [opportunityComments.workspaceId],
      references: [workspaces.id],
    }),
    report: one(reports, {
      fields: [opportunityComments.reportId],
      references: [reports.id],
    }),
    opportunity: one(moneyGapOpportunities, {
      fields: [opportunityComments.opportunityId],
      references: [moneyGapOpportunities.id],
    }),
    author: one(users, {
      fields: [opportunityComments.authorUserId],
      references: [users.id],
    }),
  }),
);

export const opportunityApprovalsRelations = relations(
  opportunityApprovals,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [opportunityApprovals.workspaceId],
      references: [workspaces.id],
    }),
    report: one(reports, {
      fields: [opportunityApprovals.reportId],
      references: [reports.id],
    }),
    opportunity: one(moneyGapOpportunities, {
      fields: [opportunityApprovals.opportunityId],
      references: [moneyGapOpportunities.id],
    }),
    client: one(clients, {
      fields: [opportunityApprovals.clientId],
      references: [clients.id],
    }),
    actor: one(users, {
      fields: [opportunityApprovals.actorUserId],
      references: [users.id],
    }),
  }),
);

export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type OpportunityComment = typeof opportunityComments.$inferSelect;
export type OpportunityApproval = typeof opportunityApprovals.$inferSelect;

/* ─── Phase 23 — Platform 1.0™ launch acks ─── */

export const workspaceLaunchAcks = pgTable(
  "workspace_launch_acks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    checkId: text("check_id").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ackedAt: timestamp("acked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_launch_acks_workspace_idx").on(t.workspaceId),
    uniqueIndex("workspace_launch_acks_workspace_check_uidx").on(
      t.workspaceId,
      t.checkId,
    ),
  ],
);

export type WorkspaceLaunchAck = typeof workspaceLaunchAcks.$inferSelect;


/* ─── Phase 22 — MoneyGap Marketplace™ ─── */

export type MarketplaceCategory =
  | "ai_agents"
  | "industry_packs"
  | "growth_playbooks"
  | "automation_recipes"
  | "dashboard_widgets"
  | "reporting_templates"
  | "blueprint_collections"
  | "fix_path_templates";

export type MarketplaceListingKind =
  | "ai_agent"
  | "industry_pack"
  | "growth_playbook"
  | "automation_recipe"
  | "dashboard_widget"
  | "reporting_template"
  | "blueprint_collection"
  | "fix_path_template";

export type MarketplaceListingPayload = {
  automationTemplateSlug?: string;
  kgIndustrySlug?: string;
  kgPlaybookSlug?: string;
  fixPathId?: string;
  agentSlug?: string;
  href?: string;
  widgetId?: string;
  reportTemplateId?: string;
  notes?: string;
};

export const marketplaceCreators = pgTable(
  "marketplace_creators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    verified: boolean("verified").notNull().default(false),
    revenueShareBps: integer("revenue_share_bps").notNull().default(7000),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("marketplace_creators_workspace_idx").on(t.workspaceId)],
);

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").$type<MarketplaceCategory>().notNull(),
    kind: text("kind").$type<MarketplaceListingKind>().notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<MarketplaceListingPayload>().notNull().default({}),
    creatorId: uuid("creator_id").references(() => marketplaceCreators.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("published"),
    // draft | published | archived
    priceCents: integer("price_cents").notNull().default(0),
    installCount: integer("install_count").notNull().default(0),
    ratingAvg: integer("rating_avg").notNull().default(0),
    // stored as tenths: 45 = 4.5
    ratingCount: integer("rating_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("marketplace_listings_category_idx").on(t.category),
    index("marketplace_listings_status_idx").on(t.status),
  ],
);

export const marketplaceInstalls = pgTable(
  "marketplace_installs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    installedByUserId: text("installed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resultRef: jsonb("result_ref").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("marketplace_installs_workspace_idx").on(t.workspaceId),
    index("marketplace_installs_listing_idx").on(t.listingId),
  ],
);

export const marketplaceReviews = pgTable(
  "marketplace_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("marketplace_reviews_listing_idx").on(t.listingId),
    uniqueIndex("marketplace_reviews_workspace_listing_uidx").on(
      t.workspaceId,
      t.listingId,
    ),
  ],
);

export const marketplacePartners = pgTable(
  "marketplace_partners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull().default("agency"),
    // agency | developer | integrator | educator
    website: text("website"),
    blurb: text("blurb"),
    verified: boolean("verified").notNull().default(false),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("marketplace_partners_status_idx").on(t.status)],
);

export const academyCourses = pgTable(
  "academy_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    level: text("level").notNull().default("intro"),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const academyLessons = pgTable(
  "academy_lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => academyCourses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("academy_lessons_course_idx").on(t.courseId),
    uniqueIndex("academy_lessons_course_slug_uidx").on(t.courseId, t.slug),
  ],
);

export const academyProgress = pgTable(
  "academy_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => academyLessons.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("academy_progress_workspace_idx").on(t.workspaceId),
    uniqueIndex("academy_progress_workspace_lesson_uidx").on(
      t.workspaceId,
      t.lessonId,
    ),
  ],
);

export type VerifiedGrowthInsightEvidence = {
  sources: string[];
  notes?: string;
};

export const verifiedGrowthInsights = pgTable(
  "verified_growth_insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    insight: text("insight").notNull(),
    evidence: jsonb("evidence").$type<VerifiedGrowthInsightEvidence>().notNull(),
    sampleSizeBand: text("sample_size_band").notNull().default("n<50"),
    confidence: integer("confidence").notNull().default(50),
    labeled: text("labeled").notNull().default("observed_trend"),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const marketplaceRevenueEvents = pgTable(
  "marketplace_revenue_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull().default(0),
    shareBps: integer("share_bps").notNull().default(7000),
    labeled: text("labeled").notNull().default("AI Estimate"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("marketplace_revenue_listing_idx").on(t.listingId),
    index("marketplace_revenue_workspace_idx").on(t.workspaceId),
  ],
);

export const marketplaceCreatorsRelations = relations(
  marketplaceCreators,
  ({ many }) => ({
    listings: many(marketplaceListings),
  }),
);

export const marketplaceListingsRelations = relations(
  marketplaceListings,
  ({ one, many }) => ({
    creator: one(marketplaceCreators, {
      fields: [marketplaceListings.creatorId],
      references: [marketplaceCreators.id],
    }),
    installs: many(marketplaceInstalls),
    reviews: many(marketplaceReviews),
  }),
);

export const marketplaceInstallsRelations = relations(
  marketplaceInstalls,
  ({ one }) => ({
    listing: one(marketplaceListings, {
      fields: [marketplaceInstalls.listingId],
      references: [marketplaceListings.id],
    }),
    workspace: one(workspaces, {
      fields: [marketplaceInstalls.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const marketplaceReviewsRelations = relations(
  marketplaceReviews,
  ({ one }) => ({
    listing: one(marketplaceListings, {
      fields: [marketplaceReviews.listingId],
      references: [marketplaceListings.id],
    }),
  }),
);

export const academyCoursesRelations = relations(academyCourses, ({ many }) => ({
  lessons: many(academyLessons),
}));

export const academyLessonsRelations = relations(academyLessons, ({ one, many }) => ({
  course: one(academyCourses, {
    fields: [academyLessons.courseId],
    references: [academyCourses.id],
  }),
  progress: many(academyProgress),
}));

export type MarketplaceCreator = typeof marketplaceCreators.$inferSelect;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type MarketplaceInstall = typeof marketplaceInstalls.$inferSelect;
export type MarketplaceReview = typeof marketplaceReviews.$inferSelect;
export type MarketplacePartner = typeof marketplacePartners.$inferSelect;
export type AcademyCourse = typeof academyCourses.$inferSelect;
export type AcademyLesson = typeof academyLessons.$inferSelect;
export type VerifiedGrowthInsight = typeof verifiedGrowthInsights.$inferSelect;

/* ─── Phase 20.6 — Self Optimization™ ─── */

export type SelfOptScanStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "partial";

export type SelfOptMetadataDraftStatus =
  | "draft"
  | "approved"
  | "applied"
  | "rejected";

export type SelfOptPrompts = {
  cursor: string;
  chatgpt: string;
  claude: string;
  gemini: string;
  copilot: string;
};

export type CrawlabilityContributorScores = {
  robots: number | null;
  sitemap: number | null;
  canonical: number | null;
  internalLinks: number | null;
  redirects: number | null;
  indexability: number | null;
};

export type SelfOptScoreBreakdown = {
  overall: number | null;
  seo: number | null;
  trust: number | null;
  conversion: number | null;
  performance: number | null;
  aiVisibility: number | null;
  contentCoverage: number | null;
  backlinkHealth: number | null;
  crawlability: number | null;
  crawlabilityStatus?: string | null;
  crawlabilityContributors?: CrawlabilityContributorScores | null;
  crawlabilitySummary?: string | null;
  crawlabilityEstimatedImprovement?: string | null;
  privacy: number | null;
  privacyStatus?: string | null;
  privacyContributors?: PrivacyContributorScores | null;
  privacySummary?: string | null;
  privacyEstimatedImprovement?: string | null;
  unavailableReasons: Record<string, string>;
};

export const selfOptimizationSettings = pgTable(
  "self_optimization_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    targetUrl: text("target_url"),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("self_opt_settings_workspace_idx").on(t.workspaceId)],
);

export const selfOptimizationScans = pgTable(
  "self_optimization_scans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    analysisId: uuid("analysis_id").references(() => websiteAnalyses.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    targetUrl: text("target_url").notNull(),
    status: text("status").$type<SelfOptScanStatus>().notNull().default("queued"),
    summary: text("summary"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("self_opt_scans_workspace_idx").on(t.workspaceId),
    index("self_opt_scans_created_idx").on(t.createdAt),
    index("self_opt_scans_status_idx").on(t.status),
  ],
);

export const selfOptimizationScores = pgTable(
  "self_optimization_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => selfOptimizationScans.id, { onDelete: "cascade" })
      .unique(),
    overall: integer("overall"),
    seo: integer("seo"),
    trust: integer("trust"),
    conversion: integer("conversion"),
    performance: integer("performance"),
    aiVisibility: integer("ai_visibility"),
    contentCoverage: integer("content_coverage"),
    backlinkHealth: integer("backlink_health"),
    crawlability: integer("crawlability"),
    crawlabilityStatus: text("crawlability_status"),
    crawlabilityContributors: jsonb("crawlability_contributors").$type<CrawlabilityContributorScores | null>(),
    crawlabilitySummary: text("crawlability_summary"),
    crawlabilityEstimatedImprovement: text("crawlability_estimated_improvement"),
    privacy: integer("privacy"),
    privacyStatus: text("privacy_status"),
    privacyContributors: jsonb("privacy_contributors").$type<PrivacyContributorScores | null>(),
    privacySummary: text("privacy_summary"),
    privacyEstimatedImprovement: text("privacy_estimated_improvement"),
    unavailableReasons: jsonb("unavailable_reasons")
      .$type<Record<string, string>>()
      .default({}),
    estimatedOpportunity: integer("estimated_opportunity"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("self_opt_scores_scan_idx").on(t.scanId)],
);

export const selfOptimizationMetadataDrafts = pgTable(
  "self_optimization_metadata_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scanId: uuid("scan_id").references(() => selfOptimizationScans.id, {
      onDelete: "set null",
    }),
    pageUrl: text("page_url").notNull(),
    currentTitle: text("current_title"),
    currentDescription: text("current_description"),
    currentOg: jsonb("current_og").$type<Record<string, string>>(),
    currentTwitter: jsonb("current_twitter").$type<Record<string, string>>(),
    currentCanonical: text("current_canonical"),
    currentJsonLd: jsonb("current_json_ld").$type<unknown[]>(),
    proposedTitle: text("proposed_title"),
    proposedDescription: text("proposed_description"),
    proposedOg: jsonb("proposed_og").$type<Record<string, string>>(),
    proposedTwitter: jsonb("proposed_twitter").$type<Record<string, string>>(),
    proposedCanonical: text("proposed_canonical"),
    proposedJsonLd: jsonb("proposed_json_ld").$type<unknown[]>(),
    snippet: text("snippet"),
    status: text("status")
      .$type<SelfOptMetadataDraftStatus>()
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("self_opt_meta_workspace_idx").on(t.workspaceId),
    index("self_opt_meta_status_idx").on(t.status),
  ],
);

export const selfOptimizationFindings = pgTable(
  "self_optimization_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => selfOptimizationScans.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(
      () => moneyGapOpportunities.id,
      { onDelete: "set null" },
    ),
    metadataDraftId: uuid("metadata_draft_id").references(
      () => selfOptimizationMetadataDrafts.id,
      { onDelete: "set null" },
    ),
    category: text("category").notNull(),
    title: text("title").notNull(),
    problem: text("problem").notNull(),
    businessImpact: text("business_impact").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    estimatedOpportunity: integer("estimated_opportunity"),
    estimateLabeled: text("estimate_labeled").notNull().default("AI Estimate"),
    confidence: integer("confidence").notNull().default(50),
    evidence: jsonb("evidence").$type<string[]>().default([]),
    fixPath: text("fix_path"),
    difficulty: text("difficulty"),
    estimatedTime: text("estimated_time"),
    priority: text("priority"),
    verificationSteps: jsonb("verification_steps").$type<string[]>().default([]),
    prompts: jsonb("prompts").$type<SelfOptPrompts>(),
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("self_opt_findings_scan_idx").on(t.scanId),
    index("self_opt_findings_category_idx").on(t.category),
  ],
);

export const selfOptimizationSettingsRelations = relations(
  selfOptimizationSettings,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [selfOptimizationSettings.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const selfOptimizationScansRelations = relations(
  selfOptimizationScans,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [selfOptimizationScans.workspaceId],
      references: [workspaces.id],
    }),
    website: one(websites, {
      fields: [selfOptimizationScans.websiteId],
      references: [websites.id],
    }),
    scores: one(selfOptimizationScores, {
      fields: [selfOptimizationScans.id],
      references: [selfOptimizationScores.scanId],
    }),
    findings: many(selfOptimizationFindings),
  }),
);

export const selfOptimizationScoresRelations = relations(
  selfOptimizationScores,
  ({ one }) => ({
    scan: one(selfOptimizationScans, {
      fields: [selfOptimizationScores.scanId],
      references: [selfOptimizationScans.id],
    }),
  }),
);

export const selfOptimizationFindingsRelations = relations(
  selfOptimizationFindings,
  ({ one }) => ({
    scan: one(selfOptimizationScans, {
      fields: [selfOptimizationFindings.scanId],
      references: [selfOptimizationScans.id],
    }),
    opportunity: one(moneyGapOpportunities, {
      fields: [selfOptimizationFindings.opportunityId],
      references: [moneyGapOpportunities.id],
    }),
    metadataDraft: one(selfOptimizationMetadataDrafts, {
      fields: [selfOptimizationFindings.metadataDraftId],
      references: [selfOptimizationMetadataDrafts.id],
    }),
  }),
);

export const selfOptimizationMetadataDraftsRelations = relations(
  selfOptimizationMetadataDrafts,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [selfOptimizationMetadataDrafts.workspaceId],
      references: [workspaces.id],
    }),
    scan: one(selfOptimizationScans, {
      fields: [selfOptimizationMetadataDrafts.scanId],
      references: [selfOptimizationScans.id],
    }),
  }),
);

export type SelfOptimizationSetting = typeof selfOptimizationSettings.$inferSelect;
export type SelfOptimizationScan = typeof selfOptimizationScans.$inferSelect;
export type SelfOptimizationScore = typeof selfOptimizationScores.$inferSelect;
export type SelfOptimizationFinding = typeof selfOptimizationFindings.$inferSelect;
export type SelfOptimizationMetadataDraft =
  typeof selfOptimizationMetadataDrafts.$inferSelect;

/* ─── Phase 20.7 — Intelligent Onboarding™ ─── */

export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "skipped"
  | "completed";

export type OnboardingStepId =
  | "welcome"
  | "website"
  | "profile"
  | "role"
  | "integrations"
  | "scan"
  | "results"
  | "complete";

export type OnboardingPersonaRole =
  | "founder"
  | "ceo"
  | "developer"
  | "marketing"
  | "sales"
  | "agency"
  | "consultant"
  | "operations";

export type DiscoverySignals = {
  ssl?: { ok: boolean; detail?: string };
  dns?: { ok: boolean; records?: string[]; detail?: string };
  hosting?: { provider?: string | null; detail?: string };
  cms?: { name?: string | null; detail?: string };
  framework?: { name?: string | null; detail?: string };
  meta?: {
    title?: string | null;
    description?: string | null;
    statusCode?: number | null;
  };
  completedAt?: string;
  error?: string | null;
};

export const workspaceOnboarding = pgTable(
  "workspace_onboarding",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    status: text("status").$type<OnboardingStatus>().notNull().default("not_started"),
    currentStep: text("current_step")
      .$type<OnboardingStepId>()
      .notNull()
      .default("welcome"),
    personaRole: text("persona_role").$type<OnboardingPersonaRole>(),
    primaryWebsiteUrl: text("primary_website_url"),
    discoverySignals: jsonb("discovery_signals").$type<DiscoverySignals>(),
    companyName: text("company_name"),
    industry: text("industry"),
    businessModel: text("business_model"),
    teamSize: text("team_size"),
    primaryGoals: jsonb("primary_goals").$type<string[]>().default([]),
    analysisId: uuid("analysis_id").references(() => websiteAnalyses.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    welcomeThreadId: uuid("welcome_thread_id").references(() => copilotThreads.id, {
      onDelete: "set null",
    }),
    checklistDismissed: jsonb("checklist_dismissed")
      .$type<string[]>()
      .notNull()
      .default([]),
    remindersDismissed: jsonb("reminders_dismissed")
      .$type<string[]>()
      .notNull()
      .default([]),
    demoExploredAt: timestamp("demo_explored_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    replayCount: integer("replay_count").notNull().default(0),
    celebrationShown: jsonb("celebration_shown")
      .$type<string[]>()
      .notNull()
      .default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("workspace_onboarding_workspace_idx").on(t.workspaceId)],
);

export const workspaceOnboardingRelations = relations(
  workspaceOnboarding,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceOnboarding.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export type WorkspaceOnboarding = typeof workspaceOnboarding.$inferSelect;

/* ─── Growth Academy™ (public content hub — distinct from Marketplace courses) ─── */

export type GaArticleStatus = "draft" | "scheduled" | "published" | "archived";
export type GaSectionType =
  | "articles"
  | "guides"
  | "tutorials"
  | "case_studies"
  | "insights"
  | "seo"
  | "conversion"
  | "technical_seo"
  | "ai"
  | "marketing"
  | "product_updates"
  | "release_notes"
  | "success_stories"
  | "research"
  | "prompt_library";

export type GaFaqItem = { question: string; answer: string };
export type GaAiAssist = {
  internalLinks?: { href: string; label: string; reason: string }[];
  externalCitations?: { url: string; label: string }[];
  socialPosts?: { channel: string; copy: string }[];
  newsletterCopy?: string;
  imagePrompts?: string[];
  ctas?: string[];
  schemaNotes?: string;
};
export type GaAuthorSocials = {
  twitter?: string;
  linkedin?: string;
  website?: string;
};

export const gaAuthors = pgTable(
  "ga_authors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    socials: jsonb("socials").$type<GaAuthorSocials>().notNull().default({}),
    expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const gaCategories = pgTable(
  "ga_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    sectionType: text("section_type").$type<GaSectionType>().notNull().default("articles"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const gaTags = pgTable("ga_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gaArticles = pgTable(
  "ga_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    status: text("status").$type<GaArticleStatus>().notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    featuredImageUrl: text("featured_image_url"),
    authorId: uuid("author_id").references(() => gaAuthors.id, {
      onDelete: "set null",
    }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    ogImage: text("og_image"),
    faqJson: jsonb("faq_json").$type<GaFaqItem[]>().notNull().default([]),
    aiAssist: jsonb("ai_assist").$type<GaAiAssist>().notNull().default({}),
    readingTimeMinutes: integer("reading_time_minutes").notNull().default(1),
    featured: boolean("featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ga_articles_status_idx").on(t.status),
    index("ga_articles_published_idx").on(t.publishedAt),
    index("ga_articles_author_idx").on(t.authorId),
  ],
);

export const gaArticleCategories = pgTable(
  "ga_article_categories",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => gaArticles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => gaCategories.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("ga_article_categories_uidx").on(t.articleId, t.categoryId),
    index("ga_article_categories_category_idx").on(t.categoryId),
  ],
);

export const gaArticleTags = pgTable(
  "ga_article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => gaArticles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => gaTags.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("ga_article_tags_uidx").on(t.articleId, t.tagId),
    index("ga_article_tags_tag_idx").on(t.tagId),
  ],
);

export const gaArticleVersions = pgTable(
  "ga_article_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => gaArticles.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    snapshot: jsonb("snapshot").notNull().default({}),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ga_article_versions_article_idx").on(t.articleId),
    uniqueIndex("ga_article_versions_uidx").on(t.articleId, t.version),
  ],
);

export const gaArticleEvents = pgTable(
  "ga_article_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => gaArticles.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    // view | share | cta | newsletter
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ga_article_events_article_idx").on(t.articleId),
    index("ga_article_events_type_idx").on(t.eventType),
  ],
);

export const gaContentIdeas = pgTable(
  "ga_content_ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    theme: text("theme").notNull(),
    source: text("source").notNull().default("content_gap"),
    status: text("status").notNull().default("open"),
    // open | drafted | dismissed
    articleId: uuid("article_id").references(() => gaArticles.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ga_content_ideas_status_idx").on(t.status)],
);

export type GaAuthor = typeof gaAuthors.$inferSelect;
export type GaCategory = typeof gaCategories.$inferSelect;
export type GaTag = typeof gaTags.$inferSelect;
export type GaArticle = typeof gaArticles.$inferSelect;
export type GaContentIdea = typeof gaContentIdeas.$inferSelect;

/** Phase 20.9 — Privacy Intelligence™ Smart Consent™ */
export type PrivacyConsentCategories = {
  essential: boolean;
  performance: boolean;
  analytics: boolean;
  personalization: boolean;
  productImprovement: boolean;
};

export type PrivacyConsentSource =
  | "smart_consent"
  | "privacy_center"
  | "withdraw";

export const privacyConsentRecords = pgTable(
  "privacy_consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    visitorKey: text("visitor_key"),
    categories: jsonb("categories").$type<PrivacyConsentCategories>().notNull(),
    policyVersion: text("policy_version").notNull(),
    consentVersion: text("consent_version").notNull(),
    source: text("source").$type<PrivacyConsentSource>().notNull(),
    regionHint: text("region_hint"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("privacy_consent_user_idx").on(t.userId),
    index("privacy_consent_workspace_idx").on(t.workspaceId),
    index("privacy_consent_visitor_idx").on(t.visitorKey),
  ],
);

export const privacyConsentEvents = pgTable(
  "privacy_consent_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordId: uuid("record_id").references(() => privacyConsentRecords.id, {
      onDelete: "set null",
    }),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
    eventType: text("event_type").notNull(),
    // consent_created | consent_updated
    categoriesEnabled: jsonb("categories_enabled").$type<string[]>().notNull().default([]),
    categoriesDisabled: jsonb("categories_disabled").$type<string[]>().notNull().default([]),
    categories: jsonb("categories").$type<PrivacyConsentCategories>().notNull(),
    policyVersion: text("policy_version").notNull(),
    consentVersion: text("consent_version").notNull(),
    source: text("source").$type<PrivacyConsentSource>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("privacy_consent_events_user_idx").on(t.userId),
    index("privacy_consent_events_workspace_idx").on(t.workspaceId),
    index("privacy_consent_events_created_idx").on(t.createdAt),
  ],
);

export type PrivacyConsentRecord = typeof privacyConsentRecords.$inferSelect;
export type PrivacyConsentEvent = typeof privacyConsentEvents.$inferSelect;

/** Phase — Growth Badge™ & Verification */
export type GrowthBadgeStyle =
  | "growth_optimized"
  | "analyzed_improved"
  | "growth_intelligence";

export type GrowthBadgeStatus = "active" | "revoked";

export const growthBadges = pgTable(
  "growth_badges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    style: text("style").$type<GrowthBadgeStyle>().notNull(),
    status: text("status").$type<GrowthBadgeStatus>().notNull().default("active"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    domain: text("domain").notNull(),
    websiteUrl: text("website_url").notNull(),
    websiteName: text("website_name").notNull(),
    moneyGapScore: integer("money_gap_score"),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    beforeScore: integer("before_score"),
    afterScore: integer("after_score"),
    improvementPoints: integer("improvement_points"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("growth_badges_workspace_idx").on(t.workspaceId),
    index("growth_badges_website_idx").on(t.websiteId),
    index("growth_badges_public_id_idx").on(t.publicId),
    index("growth_badges_status_idx").on(t.status),
  ],
);

export type GrowthBadgeEventType =
  | "issued"
  | "verified_view"
  | "embed_served"
  | "journey_updated"
  | "revoked";

export const growthBadgeEvents = pgTable(
  "growth_badge_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => growthBadges.id, { onDelete: "cascade" }),
    eventType: text("event_type").$type<GrowthBadgeEventType>().notNull(),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("growth_badge_events_badge_idx").on(t.badgeId),
    index("growth_badge_events_created_idx").on(t.createdAt),
  ],
);

export type GrowthBadge = typeof growthBadges.$inferSelect;
export type GrowthBadgeEvent = typeof growthBadgeEvents.$inferSelect;

/** Partner Foundation™ stubs — schema only; no full partner UI this pass */
export type PartnerProfileStatus = "prospect" | "certified" | "suspended";

export const partnerProfiles = pgTable(
  "partner_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    status: text("status")
      .$type<PartnerProfileStatus>()
      .notNull()
      .default("prospect"),
    referralCode: text("referral_code").notNull().unique(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("partner_profiles_workspace_idx").on(t.workspaceId),
    index("partner_profiles_referral_idx").on(t.referralCode),
  ],
);

export type PartnerReferralStatus =
  | "pending"
  | "attributed"
  | "converted"
  | "rejected";

export const partnerReferrals = pgTable(
  "partner_referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referrerWorkspaceId: uuid("referrer_workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    referredWorkspaceId: uuid("referred_workspace_id").references(
      () => workspaces.id,
      { onDelete: "set null" },
    ),
    referralCode: text("referral_code").notNull(),
    status: text("status")
      .$type<PartnerReferralStatus>()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("partner_referrals_referrer_idx").on(t.referrerWorkspaceId),
    index("partner_referrals_code_idx").on(t.referralCode),
  ],
);

export type PartnerProfile = typeof partnerProfiles.$inferSelect;
export type PartnerReferral = typeof partnerReferrals.$inferSelect;
