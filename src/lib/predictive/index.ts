export { isPredictiveIntelEnabled } from "@/lib/predictive/flag";
export { scorePredictionConfidence } from "@/lib/predictive/confidence";
export {
  loadPredictiveFeedContext,
  listPredictiveWebsites,
} from "@/lib/predictive/context";
export {
  buildPredictionDrafts,
  generateWorkspacePredictions,
  listWorkspacePredictions,
  patchPredictionStatus,
  getPredictiveOverview,
} from "@/lib/predictive/engine";
export {
  simulateWhatIf,
  runWhatIfScenario,
  listWhatIfScenarios,
} from "@/lib/predictive/what-if";
export {
  syncPredictiveAlerts,
  predictionNeedsAlert,
} from "@/lib/predictive/alerts";
export type {
  PredictionDraft,
  PredictiveFeedContext,
  WhatIfInputs,
  WhatIfResult,
} from "@/lib/predictive/types";
