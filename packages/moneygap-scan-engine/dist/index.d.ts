/** Canonical Scan Engine V3 stages (execution order). */
declare const SCAN_STAGES: readonly ["acquire", "normalize", "intelligence", "moneygap", "findings", "roadmap", "competitive", "finalize"];
type ScanStageId = (typeof SCAN_STAGES)[number];
type ScanJobStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
type ScanStageStatus = "pending" | "queued" | "running" | "completed" | "partial" | "failed" | "skipped";
type ScanProfileId = "quick" | "standard" | "deep" | "enterprise";
type StageMode = "full" | "lite" | "skip";
type StageDefinition = {
    id: ScanStageId;
    label: string;
    /** Weight toward overall progress (sums to 100). */
    weight: number;
    required: boolean;
};
declare const STAGE_DEFS: StageDefinition[];
/** Profile → stage mode. Basics (quick) skips competitive and lites heavy stages. */
declare const PROFILE_STAGE_MATRIX: Record<ScanProfileId, Record<ScanStageId, StageMode>>;
/** Stage wall deadlines (ms) by profile. */
declare const STAGE_DEADLINE_MS: Record<ScanProfileId, Record<ScanStageId, number>>;
declare const DEFAULT_LEASE_MS = 90000;
declare const HEARTBEAT_INTERVAL_MS = 20000;
declare function stagesForProfile(profile: ScanProfileId): Array<{
    id: ScanStageId;
    mode: StageMode;
    initialStatus: ScanStageStatus;
}>;
declare function computeProgress(stageStatuses: Partial<Record<ScanStageId, ScanStageStatus>>): number;
declare function firstIncompleteRequired(stageStatuses: Partial<Record<ScanStageId, ScanStageStatus>>): ScanStageId | null;
declare function isScanEngineV3Enabled(env?: Record<string, string | undefined>): boolean;

type ClaimableStageRow = {
    id: string;
    scan_job_id: string;
    stage: string;
    status: string;
    attempt: number;
    analysis_id: string;
    profile: string;
    job_status: string;
};
/** Canonical stage order for SQL ORDER BY (must match SCAN_STAGES). */
declare function stageOrderSql(alias?: string): string;
/**
 * Atomic claim SQL for the next eligible stage across all running/queued jobs.
 * Only `queued` or reclaimable `running` (expired lease) stages are claimable —
 * later stages stay `pending` until the previous stage advances them.
 * Bind: $1 workerId, $2 leaseMs (milliseconds as text).
 */
declare function claimNextStageSql(): string;
declare function heartbeatStageSql(): string;
declare function completeStageSql(): string;
declare function touchJobHeartbeatSql(): string;

type StageResultStatus = Extract<ScanStageStatus, "completed" | "partial" | "failed" | "skipped">;
type StageRunnerResult = {
    status: StageResultStatus;
    metadata?: Record<string, unknown>;
    errorClass?: string;
    errorMessage?: string;
};
type StageRunnerContext = {
    analysisId: string;
    scanJobId: string;
    stageId: string;
    stageRowId: string;
    profile: string;
    workerId: string;
    mode: "full" | "lite" | "skip";
    deadlineAtMs: number;
    signal?: AbortSignal;
    heartbeat: () => Promise<void>;
};
type StageRunner = (ctx: StageRunnerContext) => Promise<StageRunnerResult>;
type StageRunnerMap = Partial<Record<ScanStageId, StageRunner>>;

type PgQueryable = {
    query: (sql: string, params?: unknown[]) => Promise<{
        rows: Record<string, unknown>[];
    }>;
};
/**
 * Single worker tick: claim one stage, run runner, persist result, advance job.
 */
declare function processOneScanStage(client: PgQueryable, runners: StageRunnerMap, opts?: {
    workerId: string;
    leaseMs?: number;
}): Promise<{
    processed: boolean;
    stage?: string;
}>;
declare function sleep(ms: number): Promise<void>;

export { type ClaimableStageRow, DEFAULT_LEASE_MS, HEARTBEAT_INTERVAL_MS, PROFILE_STAGE_MATRIX, SCAN_STAGES, STAGE_DEADLINE_MS, STAGE_DEFS, type ScanJobStatus, type ScanProfileId, type ScanStageId, type ScanStageStatus, type StageDefinition, type StageMode, type StageRunner, type StageRunnerContext, type StageRunnerMap, type StageRunnerResult, claimNextStageSql, completeStageSql, computeProgress, firstIncompleteRequired, heartbeatStageSql, isScanEngineV3Enabled, processOneScanStage, sleep, stageOrderSql, stagesForProfile, touchJobHeartbeatSql };
