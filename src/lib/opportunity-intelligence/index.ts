export type * from "@/lib/opportunity-intelligence/types";
export { runOpportunityIntelligencePass } from "@/lib/opportunity-intelligence/run-pass";
export {
  getOiSummaryForWebsite,
  getOiBrief,
} from "@/lib/opportunity-intelligence/service";
export { computeOpportunityScore } from "@/lib/opportunity-intelligence/scoring/opportunity-score";
export {
  LocalCorpusProvider,
  createLocalCorpusProvider,
} from "@/lib/opportunity-intelligence/providers";
