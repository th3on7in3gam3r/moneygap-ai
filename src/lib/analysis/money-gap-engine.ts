/**
 * MoneyGap Engine™ public entry — delegates to modular orchestrator.
 * @see docs/moneygap-engine.md
 */
export type {
  MoneyGapEngineResult,
  MoneyGapFinding,
  MoneyGapOpportunityResult,
  ModuleId,
  GrowthRoadmap,
} from "@/lib/analysis/engine/types";

export { runMoneyGapOrchestrator as runMoneyGapEngine } from "@/lib/analysis/engine/orchestrator";
