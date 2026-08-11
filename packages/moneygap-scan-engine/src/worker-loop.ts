import {
  claimNextStageSql,
  completeStageSql,
  heartbeatStageSql,
  touchJobHeartbeatSql,
  DEFAULT_LEASE_MS,
  type ClaimableStageRow,
  type StageRunnerMap,
  type StageRunnerResult,
} from "./claim.js";
import {
  HEARTBEAT_INTERVAL_MS,
  PROFILE_STAGE_MATRIX,
  SCAN_STAGES,
  STAGE_DEADLINE_MS,
  STAGE_DEFS,
  computeProgress,
  stagesForProfile,
  type ScanProfileId,
  type ScanStageId,
  type ScanStageStatus,
  type StageMode,
} from "./stages.js";

export type PgQueryable = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

function asProfile(p: string): ScanProfileId {
  if (p === "quick" || p === "standard" || p === "deep" || p === "enterprise") {
    return p;
  }
  return "standard";
}

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...fields,
    }),
  );
}

/**
 * Single worker tick: claim one stage, run runner, persist result, advance job.
 */
export async function processOneScanStage(
  client: PgQueryable,
  runners: StageRunnerMap,
  opts: { workerId: string; leaseMs?: number } = { workerId: "worker" },
): Promise<{ processed: boolean; stage?: string }> {
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = await client.query(claimNextStageSql(), [String(leaseMs)]);
  if (!claim.rows.length) return { processed: false };

  const row = claim.rows[0]! as unknown as ClaimableStageRow;
  const stage = row.stage as ScanStageId;
  const profile = asProfile(row.profile);
  const mode: StageMode =
    PROFILE_STAGE_MATRIX[profile][stage] ?? "full";

  logEvent("STAGE_CLAIMED", {
    stageRowId: row.id,
    scanJobId: row.scan_job_id,
    analysisId: row.analysis_id,
    stage,
    attempt: row.attempt,
    workerId: opts.workerId,
  });

  await client.query(touchJobHeartbeatSql(), [
    row.scan_job_id,
    opts.workerId,
    stage,
  ]);

  if (mode === "skip") {
    await client.query(completeStageSql(), [
      row.id,
      "skipped",
      JSON.stringify({ mode: "skip" }),
      null,
      null,
    ]);
    await advanceAfterStage(client, row.scan_job_id, row.analysis_id);
    return { processed: true, stage };
  }

  const deadlineMs =
    STAGE_DEADLINE_MS[profile][stage] ?? 120_000;
  const deadlineAtMs = Date.now() + deadlineMs;
  const runner = runners[stage];

  const heartbeat = async () => {
    await client.query(heartbeatStageSql(), [row.id, String(leaseMs)]);
    await client.query(touchJobHeartbeatSql(), [
      row.scan_job_id,
      opts.workerId,
      stage,
    ]);
    logEvent("STAGE_HEARTBEAT", {
      stageRowId: row.id,
      stage,
      analysisId: row.analysis_id,
    });
  };

  const hb = setInterval(() => {
    void heartbeat().catch(() => undefined);
  }, HEARTBEAT_INTERVAL_MS);

  let result: StageRunnerResult;
  logEvent("STAGE_STARTED", {
    stageRowId: row.id,
    stage,
    analysisId: row.analysis_id,
    mode,
    deadlineMs,
  });

  try {
    if (!runner) {
      result = {
        status: "failed",
        errorClass: "MISSING_RUNNER",
        errorMessage: `No runner registered for stage ${stage}`,
      };
    } else {
      result = await runner({
        analysisId: row.analysis_id,
        scanJobId: row.scan_job_id,
        stageId: stage,
        stageRowId: row.id,
        profile,
        workerId: opts.workerId,
        mode,
        deadlineAtMs,
        heartbeat,
      });
    }
  } catch (err) {
    result = {
      status: "failed",
      errorClass: "STAGE_EXCEPTION",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearInterval(hb);
  }

  await client.query(completeStageSql(), [
    row.id,
    result.status,
    JSON.stringify({ ...(result.metadata ?? {}), mode }),
    result.errorClass ?? null,
    result.errorMessage ?? null,
  ]);

  logEvent(
    result.status === "failed" ? "STAGE_FAILED" : "STAGE_COMPLETED",
    {
      stageRowId: row.id,
      stage,
      analysisId: row.analysis_id,
      status: result.status,
      errorClass: result.errorClass ?? null,
    },
  );

  if (result.status === "failed") {
    const def = STAGE_DEFS.find((d) => d.id === stage);
    if (def?.required) {
      await client.query(
        `UPDATE scan_jobs SET status = 'failed', completed_at = NOW(),
         error_class = $2, error_message = $3, current_stage = $4
         WHERE id = $1::uuid`,
        [
          row.scan_job_id,
          result.errorClass ?? "STAGE_FAILED",
          result.errorMessage ?? "Stage failed",
          stage,
        ],
      );
      await client.query(
        `UPDATE website_analyses SET status = 'failed', scan_phase = 'failed',
         stage = 'Failed', error = $2, completed_at = NOW()
         WHERE id = $1::uuid`,
        [row.analysis_id, result.errorMessage ?? "Scan stage failed"],
      );
      logEvent("SCAN_FAILED", {
        scanJobId: row.scan_job_id,
        analysisId: row.analysis_id,
        stage,
      });
      return { processed: true, stage };
    }
  }

  await advanceAfterStage(client, row.scan_job_id, row.analysis_id);
  return { processed: true, stage };
}

async function advanceAfterStage(
  client: PgQueryable,
  scanJobId: string,
  analysisId: string,
) {
  const stages = await client.query(
    `SELECT id, stage, status FROM scan_job_stages WHERE scan_job_id = $1::uuid`,
    [scanJobId],
  );
  const map: Partial<Record<ScanStageId, ScanStageStatus>> = {};
  for (const r of stages.rows) {
    map[r.stage as ScanStageId] = r.status as ScanStageStatus;
  }
  const progress = computeProgress(map);

  await client.query(
    `UPDATE website_analyses SET progress = GREATEST(progress, $2), status = 'running'
     WHERE id = $1::uuid AND status IN ('queued', 'running')`,
    [analysisId, progress],
  );

  // Enqueue the next pending stage in canonical order.
  for (const id of SCAN_STAGES) {
    const st = map[id];
    if (st === "pending") {
      const row = stages.rows.find((r) => r.stage === id);
      if (row) {
        await client.query(
          `UPDATE scan_job_stages SET status = 'queued'
           WHERE id = $1::uuid AND status = 'pending'`,
          [row.id],
        );
        await client.query(
          `UPDATE scan_jobs SET current_stage = $2, status = 'running'
           WHERE id = $1::uuid AND status IN ('queued', 'running')`,
          [scanJobId, id],
        );
      }
      return;
    }
    if (st === "queued" || st === "running") return;
  }

  const anyPartial = stages.rows.some((r) => r.status === "partial");
  const anyFailedOptional = stages.rows.some((r) => r.status === "failed");
  const finalStatus =
    anyPartial || anyFailedOptional ? "partial" : "completed";

  await client.query(
    `UPDATE scan_jobs SET status = $2, completed_at = NOW(), current_stage = 'finalize'
     WHERE id = $1::uuid`,
    [scanJobId, finalStatus],
  );
  await client.query(
    `UPDATE website_analyses SET
       status = 'completed',
       scan_phase = 'completed',
       stage = 'Complete',
       progress = 100,
       completed_at = NOW(),
       scan_meta = COALESCE(scan_meta, '{}'::jsonb) || jsonb_build_object('partial', $2::boolean)
     WHERE id = $1::uuid AND report_id IS NOT NULL`,
    [analysisId, finalStatus === "partial"],
  );
  logEvent("SCAN_COMPLETED", {
    scanJobId,
    analysisId,
    status: finalStatus,
  });
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export {
  stagesForProfile,
  computeProgress,
  PROFILE_STAGE_MATRIX,
  STAGE_DEFS,
  SCAN_STAGES,
};
