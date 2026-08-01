/**
 * Public MoneyGap Engine™ entry.
 * Internals are modular — see `src/lib/analysis/engine/`.
 */
export type {
  MoneyGapEngineResult,
  MoneyGapFinding,
  MoneyGapOpportunityResult,
  ModuleId,
  GrowthRoadmap,
} from "@/lib/analysis/engine/types";

export { runMoneyGapOrchestrator as runMoneyGapEngine } from "@/lib/analysis/engine/orchestrator";
