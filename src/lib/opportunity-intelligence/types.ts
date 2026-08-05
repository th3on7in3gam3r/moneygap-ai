/** Opportunity Intelligence™ & Growth Graph™ — shared types (Phase 1). */

export type GrowthGraphNodeType =
  | "website"
  | "page"
  | "topic"
  | "keyword"
  | "entity"
  | "question"
  | "intent"
  | "product"
  | "service"
  | "competitor"
  | "revenue_opportunity"
  | "moneygap_score"
  | "ai_readiness"
  | "schema_gap"
  | "roadmap_item";

export type GrowthGraphEdgeType =
  | "has_page"
  | "about_topic"
  | "targets_keyword"
  | "has_intent"
  | "asks_question"
  | "mentions_entity"
  | "offers_product"
  | "offers_service"
  | "competes_with"
  | "gap_vs"
  | "drives_revenue"
  | "improves_score"
  | "implements_via"
  | "depends_on";

export type SearchIntentKind =
  | "informational"
  | "navigational"
  | "commercial"
  | "transactional"
  | "local"
  | "ai_assistant"
  | "educational"
  | "comparison"
  | "problem_solving";

export type KeywordKind =
  | "primary"
  | "secondary"
  | "long_tail"
  | "commercial"
  | "transactional"
  | "local"
  | "informational"
  | "question"
  | "branded"
  | "comparison"
  | "ai_search";

export type OiRecommendationKind =
  | "missing_topic"
  | "missing_page"
  | "missing_service"
  | "missing_faq"
  | "missing_guide"
  | "missing_kb"
  | "missing_landing_page"
  | "missing_schema"
  | "missing_internal_links"
  | "competitor_gap"
  | "ai_readiness"
  | "entity_coverage"
  | "keyword_cluster";

export type ImpactLevel = "high" | "medium" | "low";

export type OpportunityScoreFactors = {
  businessValue: number;
  revenuePotential: number;
  searchDemand: number;
  competition: number;
  implementationEffort: number;
  aiVisibility: number;
  topicalAuthority: number;
};

export type KeywordCluster = {
  id: string;
  label: string;
  primary: string;
  keywords: { term: string; kind: KeywordKind; intent: SearchIntentKind }[];
  intent: SearchIntentKind;
  demandProxy: number;
};

export type SemanticEntity = {
  id: string;
  label: string;
  type:
    | "person"
    | "organization"
    | "product"
    | "service"
    | "technology"
    | "location"
    | "industry"
    | "framework"
    | "standard"
    | "concept";
  recommended?: boolean;
};

export type CustomerQuestion = {
  id: string;
  question: string;
  intent: SearchIntentKind;
  relatedService?: string | null;
  suggestFaq: boolean;
  suggestGuide: boolean;
};

export type ContentBriefPayload = {
  suggestedTitle: string;
  description: string;
  targetAudience: string;
  primaryIntent: SearchIntentKind;
  recommendedHeadings: string[];
  suggestedFaqs: string[];
  internalLinks: string[];
  externalReferences: string[];
  schemaRecommendations: string[];
  callsToAction: string[];
  successMetrics: string[];
  implementationLinks: { label: string; href: string }[];
};

export type OiRecommendationDraft = {
  kind: OiRecommendationKind;
  title: string;
  summary: string;
  whyItMatters: string;
  businessImpact: ImpactLevel;
  seoImpact: ImpactLevel;
  aiReadinessImpact: ImpactLevel;
  difficulty: string;
  estimatedTime: string;
  priority: number;
  dependencies: string[];
  nextSteps: string[];
  factors: OpportunityScoreFactors;
  opportunityScore: number;
  intent?: SearchIntentKind | null;
  moneyGapOpportunityId?: string | null;
  implementationLinks: { label: string; href: string }[];
  meta?: Record<string, unknown>;
};

export type ContentRoadmapItem = {
  id: string;
  title: string;
  action: string;
  businessImpact: ImpactLevel;
  seoImpact: ImpactLevel;
  aiReadinessImpact: ImpactLevel;
  difficulty: string;
  estimatedTime: string;
  priority: number;
  opportunityScore: number;
  dependencies: string[];
  recommendationKind: OiRecommendationKind;
};

export type GrowthGraphNodeDraft = {
  tempId: string;
  nodeType: GrowthGraphNodeType;
  label: string;
  slug: string;
  meta?: Record<string, unknown>;
};

export type GrowthGraphEdgeDraft = {
  fromTempId: string;
  toTempId: string;
  edgeType: GrowthGraphEdgeType;
  weight?: number;
  meta?: Record<string, unknown>;
};

export type OpportunityIntelligenceSnapshot = {
  generatedAt: string;
  recommendationCount: number;
  roadmapCount: number;
  briefCount: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  keywordClusterCount: number;
  questionCount: number;
  entityCount: number;
  avgOpportunityScore: number | null;
  topRecommendations: {
    title: string;
    kind: OiRecommendationKind;
    opportunityScore: number;
    businessImpact: ImpactLevel;
  }[];
  roadmapPreview: {
    title: string;
    businessImpact: ImpactLevel;
    opportunityScore: number;
  }[];
  executiveBlurb: string | null;
};

export type DemandRow = { term: string; demandProxy: number };
export type QueryRow = { query: string; clicks: number; impressions: number };
