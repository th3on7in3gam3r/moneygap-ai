export { isSelfOptimizationEnabled } from "./flag";
export { resolveSelfScanTarget, upsertSelfOptSettings, resolveDefaultSelfUrl } from "./config";
export { runSelfOptimizationScan, runDailySelfScan } from "./scan";
export { getScanSummaries, getLatestScores } from "./reports/daily";
export { generatePrompts, attachPrompts } from "./prompts/generate";
export { proposeMetadata } from "./metadata/generate";
export { confirmMetadataApply, rejectMetadataDraft } from "./metadata/apply";
