/** AI Readiness Engine™ — types (health score polarity: higher = better) */

export type RecommendationPriority = "critical" | "high" | "medium" | "low" | "info";

export type EffortEstimate = "low" | "medium" | "high";

export type AiReadinessIssue = {
  ruleId: string;
  severity: RecommendationPriority;
  message: string;
};

export type AiReadinessRecommendation = {
  title: string;
  priority: RecommendationPriority;
  impact: string;
  whyItMatters: string;
  recommendedAction: string;
  estimatedEffort: EffortEstimate;
  ruleId?: string;
};

export type LlmsValidationResult = {
  rulesetVersion: string;
  score: number;
  errors: AiReadinessIssue[];
  warnings: AiReadinessIssue[];
  suggestions: AiReadinessIssue[];
  recommendations: AiReadinessRecommendation[];
  sectionsFound: string[];
  present: boolean;
  empty: boolean;
};

export type LlmsGenerateInput = {
  organizationName: string;
  domain: string;
  summary?: string;
  products?: string[];
  services?: string[];
  audience?: string;
  importantUrls?: { label: string; url: string }[];
  documentationUrls?: string[];
  knowledgeUrls?: string[];
  faqUrl?: string;
  supportUrl?: string;
  contactUrl?: string;
  canonicalResources?: string[];
  updatedAt?: string;
};

export type KnowledgeResource = {
  kind: "docs" | "help" | "blog" | "faq" | "support" | "other";
  url: string;
};

export type AiReadinessSignals = {
  llmsPresent: boolean;
  llmsValidationScore: number | null;
  hasJsonLd: boolean;
  hasOrganizationSchema: boolean;
  hasFaqSchema: boolean;
  hasArticleSchema: boolean;
  hasSemanticHeadings: boolean;
  hasCanonical: boolean;
  hasContactTransparency: boolean;
  hasDocumentation: boolean;
  knowledgeResourceCount: number;
};

export type AiReadinessScoreBreakdown = {
  llms: number;
  structuredData: number;
  entityClarity: number;
  knowledge: number;
  metadata: number;
};

export type AiReadinessScoreResult = {
  score: number;
  breakdown: AiReadinessScoreBreakdown;
  recommendations: AiReadinessRecommendation[];
  rulesetVersion: string;
};
