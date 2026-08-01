import type {
  CompetitiveAnalysisPayload,
  CompetitorProfileData,
} from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";

export type DiscoveredCompetitor = {
  name: string;
  url: string;
  domain: string;
  businessSummary: string;
  industry: string;
  targetAudience: string;
  estimatedCompanySize: string;
};

export type CompetitorWithCorpus = DiscoveredCompetitor & {
  corpus: string;
  crawlOk: boolean;
};

export type ProfiledCompetitor = CompetitorWithCorpus & {
  profile: CompetitorProfileData | null;
  status: "discovered" | "crawled" | "profiled" | "failed";
};

export type CompetitiveOrchestratorResult = {
  competitiveBrief: string;
  competitiveAnalysis: CompetitiveAnalysisPayload;
  competitors: ProfiledCompetitor[];
  competitiveScore: number;
};

export type CompetitiveContext = {
  url: string;
  domain: string;
  siteName: string;
  intelligence: IntelligenceResult;
  userCorpus: string;
};

export const COMPETITOR_COUNT = 7;
export const PAGES_PER_COMPETITOR = 4;

export type { CompetitiveAnalysisPayload, CompetitorProfileData };
