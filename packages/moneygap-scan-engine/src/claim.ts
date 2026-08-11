import {
  DEFAULT_LEASE_MS,
  type ScanStageId,
  type ScanStageStatus,
} from "./stages.js";

export type ClaimableStageRow = {
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
export function stageOrderSql(alias = "s"): string {
  return `CASE ${alias}.stage
    WHEN 'acquire' THEN 1
    WHEN 'normalize' THEN 2
    WHEN 'intelligence' THEN 3
    WHEN 'moneygap' THEN 4
    WHEN 'findings' THEN 5
    WHEN 'roadmap' THEN 6
    WHEN 'competitive' THEN 7
    WHEN 'finalize' THEN 8
    ELSE 99
  END`;
}

/**
 * Atomic claim SQL for the next eligible stage across all running/queued jobs.
 * Only `queued` or reclaimable `running` (expired lease) stages are claimable —
 * later stages stay `pending` until the previous stage advances them.
 * Bind: $1 workerId, $2 leaseMs (milliseconds as text).
 */
export function claimNextStageSql(): string {
  return `
    WITH candidate AS (
      SELECT s.id
      FROM scan_job_stages s
      INNER JOIN scan_jobs j ON j.id = s.scan_job_id
      WHERE j.status IN ('queued', 'running')
        AND (
          s.status = 'queued'
          OR (
            s.status = 'running'
            AND s.lease_expires_at IS NOT NULL
            AND s.lease_expires_at < NOW()
          )
        )
        AND (
          s.lease_expires_at IS NULL
          OR s.lease_expires_at < NOW()
        )
      ORDER BY j.created_at ASC, ${stageOrderSql("s")} ASC
      LIMIT 1
      FOR UPDATE OF s SKIP LOCKED
    )
    UPDATE scan_job_stages s
    SET
      status = 'running',
      attempt = s.attempt + 1,
      claimed_at = NOW(),
      started_at = COALESCE(s.started_at, NOW()),
      heartbeat_at = NOW(),
      lease_expires_at = NOW() + ($2::text || ' milliseconds')::interval,
      error_class = NULL,
      error_message = NULL
    FROM candidate c, scan_jobs j
    WHERE s.id = c.id AND j.id = s.scan_job_id
    RETURNING
      s.id,
      s.scan_job_id,
      s.stage,
      s.status,
      s.attempt,
      j.analysis_id,
      j.profile,
      j.status AS job_status
  `;
}

export function heartbeatStageSql(): string {
  return `
    UPDATE scan_job_stages
    SET
      heartbeat_at = NOW(),
      lease_expires_at = NOW() + ($2::text || ' milliseconds')::interval
    WHERE id = $1::uuid AND status = 'running'
    RETURNING id
  `;
}

export function completeStageSql(): string {
  return `
    UPDATE scan_job_stages
    SET
      status = $2,
      completed_at = NOW(),
      duration_ms = GREATEST(0, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
        - (EXTRACT(EPOCH FROM COALESCE(started_at, NOW())) * 1000)::bigint),
      lease_expires_at = NULL,
      heartbeat_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE($3::jsonb, '{}'::jsonb),
      error_class = $4,
      error_message = $5
    WHERE id = $1::uuid
    RETURNING id, scan_job_id, stage, status
  `;
}

export function touchJobHeartbeatSql(): string {
  return `
    UPDATE scan_jobs
    SET
      status = CASE WHEN status = 'queued' THEN 'running' ELSE status END,
      started_at = COALESCE(started_at, NOW()),
      last_heartbeat_at = NOW(),
      worker_id = $2,
      current_stage = $3
    WHERE id = $1::uuid
    RETURNING id
  `;
}

export { DEFAULT_LEASE_MS };

export type StageResultStatus = Extract<
  ScanStageStatus,
  "completed" | "partial" | "failed" | "skipped"
>;

export type StageRunnerResult = {
  status: StageResultStatus;
  metadata?: Record<string, unknown>;
  errorClass?: string;
  errorMessage?: string;
};

export type StageRunnerContext = {
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

export type StageRunner = (
  ctx: StageRunnerContext,
) => Promise<StageRunnerResult>;

export type StageRunnerMap = Partial<Record<ScanStageId, StageRunner>>;
