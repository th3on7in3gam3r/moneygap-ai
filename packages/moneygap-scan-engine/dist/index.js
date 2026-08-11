// src/stages.ts
var SCAN_STAGES = [
  "acquire",
  "normalize",
  "intelligence",
  "moneygap",
  "findings",
  "roadmap",
  "competitive",
  "finalize"
];
var STAGE_DEFS = [
  { id: "acquire", label: "Website Acquisition", weight: 20, required: true },
  { id: "normalize", label: "Normalize Content", weight: 8, required: true },
  { id: "intelligence", label: "Business Intelligence", weight: 18, required: true },
  { id: "moneygap", label: "MoneyGap Analysis", weight: 18, required: true },
  { id: "findings", label: "Deep Findings", weight: 10, required: false },
  { id: "roadmap", label: "Fix Roadmap", weight: 12, required: false },
  { id: "competitive", label: "Competitive Intelligence", weight: 8, required: false },
  { id: "finalize", label: "Report", weight: 6, required: true }
];
var PROFILE_STAGE_MATRIX = {
  quick: {
    acquire: "full",
    normalize: "full",
    intelligence: "lite",
    moneygap: "lite",
    findings: "lite",
    roadmap: "lite",
    competitive: "skip",
    finalize: "full"
  },
  standard: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full"
  },
  deep: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full"
  },
  enterprise: {
    acquire: "full",
    normalize: "full",
    intelligence: "full",
    moneygap: "full",
    findings: "full",
    roadmap: "full",
    competitive: "full",
    finalize: "full"
  }
};
var STAGE_DEADLINE_MS = {
  quick: {
    acquire: 9e4,
    normalize: 3e4,
    intelligence: 9e4,
    moneygap: 12e4,
    findings: 45e3,
    roadmap: 3e4,
    competitive: 15e3,
    finalize: 3e4
  },
  standard: {
    acquire: 10 * 6e4,
    normalize: 6e4,
    intelligence: 18e4,
    moneygap: 5 * 6e4,
    findings: 12e4,
    roadmap: 9e4,
    competitive: 4 * 6e4,
    finalize: 6e4
  },
  deep: {
    acquire: 20 * 6e4,
    normalize: 9e4,
    intelligence: 24e4,
    moneygap: 8 * 6e4,
    findings: 18e4,
    roadmap: 12e4,
    competitive: 8 * 6e4,
    finalize: 6e4
  },
  enterprise: {
    acquire: 45 * 6e4,
    normalize: 12e4,
    intelligence: 3e5,
    moneygap: 12 * 6e4,
    findings: 24e4,
    roadmap: 18e4,
    competitive: 12 * 6e4,
    finalize: 9e4
  }
};
var DEFAULT_LEASE_MS = 9e4;
var HEARTBEAT_INTERVAL_MS = 2e4;
function stagesForProfile(profile) {
  const matrix = PROFILE_STAGE_MATRIX[profile] ?? PROFILE_STAGE_MATRIX.standard;
  let queuedFirst = false;
  return SCAN_STAGES.map((id) => {
    const mode = matrix[id];
    if (mode === "skip") {
      return { id, mode, initialStatus: "skipped" };
    }
    if (!queuedFirst) {
      queuedFirst = true;
      return { id, mode, initialStatus: "queued" };
    }
    return { id, mode, initialStatus: "pending" };
  });
}
function computeProgress(stageStatuses) {
  let done = 0;
  let total = 0;
  for (const def of STAGE_DEFS) {
    total += def.weight;
    const st = stageStatuses[def.id];
    if (st === "completed" || st === "skipped" || st === "partial") {
      done += def.weight;
    } else if (st === "running") {
      done += def.weight * 0.4;
    }
  }
  return Math.min(99, Math.round(done / Math.max(1, total) * 100));
}
function firstIncompleteRequired(stageStatuses) {
  for (const def of STAGE_DEFS) {
    if (!def.required) continue;
    const st = stageStatuses[def.id];
    if (st !== "completed" && st !== "skipped") return def.id;
  }
  for (const def of STAGE_DEFS) {
    const st = stageStatuses[def.id];
    if (st === "failed" || st === "queued" || st === "pending" || st === "running") {
      if (PROFILE_STAGE_MATRIX.standard[def.id] !== "skip") return def.id;
    }
  }
  return null;
}
function isScanEngineV3Enabled(env = process.env) {
  const v = env.SCAN_ENGINE_V3?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

// src/claim.ts
function stageOrderSql(alias = "s") {
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
function claimNextStageSql() {
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
function heartbeatStageSql() {
  return `
    UPDATE scan_job_stages
    SET
      heartbeat_at = NOW(),
      lease_expires_at = NOW() + ($2::text || ' milliseconds')::interval
    WHERE id = $1::uuid AND status = 'running'
    RETURNING id
  `;
}
function completeStageSql() {
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
function touchJobHeartbeatSql() {
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

// src/worker-loop.ts
function asProfile(p) {
  if (p === "quick" || p === "standard" || p === "deep" || p === "enterprise") {
    return p;
  }
  return "standard";
}
function logEvent(event, fields) {
  console.log(
    JSON.stringify({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      event,
      ...fields
    })
  );
}
async function processOneScanStage(client, runners, opts = { workerId: "worker" }) {
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = await client.query(claimNextStageSql(), [
    opts.workerId,
    String(leaseMs)
  ]);
  if (!claim.rows.length) return { processed: false };
  const row = claim.rows[0];
  const stage = row.stage;
  const profile = asProfile(row.profile);
  const mode = PROFILE_STAGE_MATRIX[profile][stage] ?? "full";
  logEvent("STAGE_CLAIMED", {
    stageRowId: row.id,
    scanJobId: row.scan_job_id,
    analysisId: row.analysis_id,
    stage,
    attempt: row.attempt,
    workerId: opts.workerId
  });
  await client.query(touchJobHeartbeatSql(), [
    row.scan_job_id,
    opts.workerId,
    stage
  ]);
  if (mode === "skip") {
    await client.query(completeStageSql(), [
      row.id,
      "skipped",
      JSON.stringify({ mode: "skip" }),
      null,
      null
    ]);
    await advanceAfterStage(client, row.scan_job_id, row.analysis_id);
    return { processed: true, stage };
  }
  const deadlineMs = STAGE_DEADLINE_MS[profile][stage] ?? 12e4;
  const deadlineAtMs = Date.now() + deadlineMs;
  const runner = runners[stage];
  const heartbeat = async () => {
    await client.query(heartbeatStageSql(), [row.id, String(leaseMs)]);
    await client.query(touchJobHeartbeatSql(), [
      row.scan_job_id,
      opts.workerId,
      stage
    ]);
    logEvent("STAGE_HEARTBEAT", {
      stageRowId: row.id,
      stage,
      analysisId: row.analysis_id
    });
  };
  const hb = setInterval(() => {
    void heartbeat().catch(() => void 0);
  }, HEARTBEAT_INTERVAL_MS);
  let result;
  logEvent("STAGE_STARTED", {
    stageRowId: row.id,
    stage,
    analysisId: row.analysis_id,
    mode,
    deadlineMs
  });
  try {
    if (!runner) {
      result = {
        status: "failed",
        errorClass: "MISSING_RUNNER",
        errorMessage: `No runner registered for stage ${stage}`
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
        heartbeat
      });
    }
  } catch (err) {
    result = {
      status: "failed",
      errorClass: "STAGE_EXCEPTION",
      errorMessage: err instanceof Error ? err.message : String(err)
    };
  } finally {
    clearInterval(hb);
  }
  await client.query(completeStageSql(), [
    row.id,
    result.status,
    JSON.stringify({ ...result.metadata ?? {}, mode }),
    result.errorClass ?? null,
    result.errorMessage ?? null
  ]);
  logEvent(
    result.status === "failed" ? "STAGE_FAILED" : "STAGE_COMPLETED",
    {
      stageRowId: row.id,
      stage,
      analysisId: row.analysis_id,
      status: result.status,
      errorClass: result.errorClass ?? null
    }
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
          stage
        ]
      );
      await client.query(
        `UPDATE website_analyses SET status = 'failed', scan_phase = 'failed',
         stage = 'Failed', error = $2, completed_at = NOW()
         WHERE id = $1::uuid`,
        [row.analysis_id, result.errorMessage ?? "Scan stage failed"]
      );
      logEvent("SCAN_FAILED", {
        scanJobId: row.scan_job_id,
        analysisId: row.analysis_id,
        stage
      });
      return { processed: true, stage };
    }
  }
  await advanceAfterStage(client, row.scan_job_id, row.analysis_id);
  return { processed: true, stage };
}
async function advanceAfterStage(client, scanJobId, analysisId) {
  const stages = await client.query(
    `SELECT id, stage, status FROM scan_job_stages WHERE scan_job_id = $1::uuid`,
    [scanJobId]
  );
  const map = {};
  for (const r of stages.rows) {
    map[r.stage] = r.status;
  }
  const progress = computeProgress(map);
  await client.query(
    `UPDATE website_analyses SET progress = GREATEST(progress, $2), status = 'running'
     WHERE id = $1::uuid AND status IN ('queued', 'running')`,
    [analysisId, progress]
  );
  for (const id of SCAN_STAGES) {
    const st = map[id];
    if (st === "pending") {
      const row = stages.rows.find((r) => r.stage === id);
      if (row) {
        await client.query(
          `UPDATE scan_job_stages SET status = 'queued'
           WHERE id = $1::uuid AND status = 'pending'`,
          [row.id]
        );
        await client.query(
          `UPDATE scan_jobs SET current_stage = $2, status = 'running'
           WHERE id = $1::uuid AND status IN ('queued', 'running')`,
          [scanJobId, id]
        );
      }
      return;
    }
    if (st === "queued" || st === "running") return;
  }
  const anyPartial = stages.rows.some((r) => r.status === "partial");
  const anyFailedOptional = stages.rows.some((r) => r.status === "failed");
  const finalStatus = anyPartial || anyFailedOptional ? "partial" : "completed";
  await client.query(
    `UPDATE scan_jobs SET status = $2, completed_at = NOW(), current_stage = 'finalize'
     WHERE id = $1::uuid`,
    [scanJobId, finalStatus]
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
    [analysisId, finalStatus === "partial"]
  );
  logEvent("SCAN_COMPLETED", {
    scanJobId,
    analysisId,
    status: finalStatus
  });
}
async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}
export {
  DEFAULT_LEASE_MS,
  HEARTBEAT_INTERVAL_MS,
  PROFILE_STAGE_MATRIX,
  SCAN_STAGES,
  STAGE_DEADLINE_MS,
  STAGE_DEFS,
  claimNextStageSql,
  completeStageSql,
  computeProgress,
  firstIncompleteRequired,
  heartbeatStageSql,
  isScanEngineV3Enabled,
  processOneScanStage,
  sleep,
  stageOrderSql,
  stagesForProfile,
  touchJobHeartbeatSql
};
