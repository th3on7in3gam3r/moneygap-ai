export {
  SCAN_STAGES,
  STAGE_DEFS,
  PROFILE_STAGE_MATRIX,
  STAGE_DEADLINE_MS,
  DEFAULT_LEASE_MS,
  HEARTBEAT_INTERVAL_MS,
  stagesForProfile,
  computeProgress,
  firstIncompleteRequired,
  isScanEngineV3Enabled,
  type ScanStageId,
  type ScanJobStatus,
  type ScanStageStatus,
  type ScanProfileId,
  type StageMode,
  type StageDefinition,
} from "./stages.js";

export {
  claimNextStageSql,
  stageOrderSql,
  heartbeatStageSql,
  completeStageSql,
  touchJobHeartbeatSql,
  type ClaimableStageRow,
  type StageRunner,
  type StageRunnerMap,
  type StageRunnerContext,
  type StageRunnerResult,
} from "./claim.js";

export { processOneScanStage, sleep } from "./worker-loop.js";
