import type {
  CategoryScores,
  GrowthRoadmapItem,
  OpportunityFix,
} from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";

export const MODULE_IDS = [
  "revenue",
  "authority",
  "seo",
  "content",
  "trust",
  "conversion",
  "marketing",
  "automation",
  "customer",
  "ai",
  "competitive",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export type DetectionStatus = "found" | "not_found" | "partial";

export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type MoneyGapFinding = {
  moduleId: ModuleId;
  category: string;
  title: string;
  detectionStatus: DetectionStatus;
  summary: string;
  whatsMissing: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedAnnualRevenue: number | null;
  estimatedLeads: number | null;
  estimatedTraffic: number | null;
  estimatedConversionLift: number | null;
  estimateRationale: string;
  confidence: number;
  likelyCauses: string[];
  fixes: OpportunityFix[];
  helpfulResources: string[];
  severity: FindingSeverity;
  difficulty: string;
  estimatedTime: string;
  expectedRoi: number;
  opportunityIndex: number;
  priorityScore: number;
  /** Phase 11 Trust Engine™ (optional from LLM; synthesized if absent) */
  evidenceSummary?: string;
  supportingSignals?: string[];
  businessReasoning?: string;
  detectionSource?: string;
  confidenceLevel?: "very_high" | "high" | "medium" | "low";
  trustMeta?: {
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
  /** Phase 13 Knowledge Graph™ soft boosts */
  kgMeta?: {
    industrySlug?: string;
    businessModelSlug?: string;
    ruleHits?: string[];
    patternHits?: string[];
    priorityBoost?: number;
    industryFitNote?: string;
    businessModelFitNote?: string;
    patternFitNote?: string;
  };
};

export type EngineContext = {
  url: string;
  domain: string;
  intelligence: IntelligenceResult;
  corpus: string;
  /** Compact Knowledge Graph guidance for module prompts (optional). */
  kgContext?: string;
  /** Envelope deadline / cancel signal for in-flight module LLM calls. */
  signal?: AbortSignal;
};

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  mission: string;
  absenceCatalog: string[];
};

export type GrowthRoadmap = {
  today: GrowthRoadmapItem[];
  thisWeek: GrowthRoadmapItem[];
  thisMonth: GrowthRoadmapItem[];
  nextQuarter: GrowthRoadmapItem[];
};

/** Public engine result (backward-compatible + modular fields). */
export type MoneyGapEngineResult = {
  opportunitySummary: string;
  executiveBrief: string;
  opportunities: MoneyGapFinding[];
  categoryScores: CategoryScores;
  growthRoadmap: GrowthRoadmap;
  moneyGapScore: number;
  revenueAtRisk: number;
  capturePotential: number;
};

/** @deprecated Prefer MoneyGapFinding */
export type MoneyGapOpportunityResult = MoneyGapFinding;

export const EMPTY_CATEGORY_SCORES: CategoryScores = {
  revenue: 0,
  authority: 0,
  seo: 0,
  content: 0,
  trust: 0,
  conversion: 0,
  marketing: 0,
  automation: 0,
  customer: 0,
  ai: 0,
  competitive: 0,
};

export const EMPTY_ROADMAP: GrowthRoadmap = {
  today: [],
  thisWeek: [],
  thisMonth: [],
  nextQuarter: [],
};
