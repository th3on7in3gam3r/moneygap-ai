import type {
  PredictionHorizon,
  PredictionImpactEstimate,
  PredictionKind,
  WhatIfInputs,
  WhatIfResult,
} from "@/db/schema";

export type PredictionDraft = {
  kind: PredictionKind;
  title: string;
  prediction: string;
  evidence: string[];
  confidence: number;
  horizon: PredictionHorizon;
  recommendedAction: string;
  impactEstimate: PredictionImpactEstimate;
  websiteId?: string | null;
  meta?: Record<string, unknown>;
};

export type PredictiveFeedContext = {
  notes: string[];
  websiteId: string | null;
  websiteName: string | null;
  websiteDomain: string | null;
  scores: { moneyGapScore: number; revenueAtRisk: number; createdAt: Date }[];
  latestScore: number | null;
  scoreTrend: number | null;
  openGaps: {
    id: string;
    title: string;
    moduleId: string;
    category: string;
    severity: string;
    opportunityIndex: number;
    estimatedAnnualRevenue: number | null;
    reportId: string;
  }[];
  competitorNotes: string[];
  industrySlug: string | null;
  hubConnectedCount: number;
};

export type { WhatIfInputs, WhatIfResult, PredictionKind, PredictionHorizon };
