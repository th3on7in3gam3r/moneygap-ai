import { computeProgress, STAGE_DEFS, type ScanStageId } from "moneygap-scan-engine";
import { getScanJobStatus } from "./create-job";

const STALE_HEARTBEAT_MS = 90_000;

export type ScanWorkerPresence =
  | "processing"
  | "waiting_for_worker"
  | "recovering"
  | "idle"
  | "done"
  | "failed";

export async function buildScanEngineStatusPayload(analysisId: string) {
  const data = await getScanJobStatus(analysisId);
  if (!data) return null;

  const { job, stages } = data;
  const statusMap: Partial<Record<ScanStageId, string>> = {};
  for (const s of stages) {
    statusMap[s.stage as ScanStageId] = s.status;
  }
  const progress = computeProgress(
    statusMap as Parameters<typeof computeProgress>[0],
  );

  const now = Date.now();
  const hb = job.lastHeartbeatAt?.getTime() ?? 0;
  const runningStage = stages.find((s) => s.status === "running");
  const leaseExpired =
    runningStage?.leaseExpiresAt != null &&
    runningStage.leaseExpiresAt.getTime() < now;

  let workerPresence: ScanWorkerPresence = "idle";
  if (job.status === "completed" || job.status === "partial") {
    workerPresence = "done";
  } else if (job.status === "failed" || job.status === "cancelled") {
    workerPresence = "failed";
  } else if (leaseExpired || (runningStage && now - hb > STALE_HEARTBEAT_MS)) {
    workerPresence = "recovering";
  } else if (runningStage && now - hb <= STALE_HEARTBEAT_MS) {
    workerPresence = "processing";
  } else if (job.status === "queued" || stages.some((s) => s.status === "queued")) {
    workerPresence = "waiting_for_worker";
  }

  const stageCards = STAGE_DEFS.map((def) => {
    const row = stages.find((s) => s.stage === def.id);
    return {
      id: def.id,
      label: def.label,
      weight: def.weight,
      required: def.required,
      status: row?.status ?? "pending",
      attempt: row?.attempt ?? 0,
      durationMs: row?.durationMs ?? null,
      startedAt: row?.startedAt?.toISOString() ?? null,
      completedAt: row?.completedAt?.toISOString() ?? null,
      leaseExpiresAt: row?.leaseExpiresAt?.toISOString() ?? null,
      heartbeatAt: row?.heartbeatAt?.toISOString() ?? null,
      errorClass: row?.errorClass ?? null,
      errorMessage: row?.errorMessage ?? null,
    };
  });

  return {
    scanEngine: "v3" as const,
    scanJobId: job.id,
    jobStatus: job.status,
    currentStage: job.currentStage,
    profile: job.profile,
    progress,
    workerPresence,
    workerId: job.workerId,
    lastHeartbeatAt: job.lastHeartbeatAt?.toISOString() ?? null,
    errorClass: job.errorClass,
    errorMessage: job.errorMessage,
    stages: stageCards,
    diagnostics: {
      scanId: analysisId,
      scanJobId: job.id,
      workerId: job.workerId,
      lastHeartbeatAt: job.lastHeartbeatAt?.toISOString() ?? null,
      currentStage: job.currentStage,
      leaseExpiresAt: runningStage?.leaseExpiresAt?.toISOString() ?? null,
      errorClass: job.errorClass ?? runningStage?.errorClass ?? null,
      errorMessage: job.errorMessage ?? runningStage?.errorMessage ?? null,
    },
  };
}

export function isV3AnalysisMeta(scanMeta: unknown): boolean {
  return (
    !!scanMeta &&
    typeof scanMeta === "object" &&
    (scanMeta as { scanEngine?: unknown }).scanEngine === "v3"
  );
}
