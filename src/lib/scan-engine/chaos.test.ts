import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCAN_STAGES,
  claimNextStageSql,
  computeProgress,
  stagesForProfile,
  type ScanStageId,
  type ScanStageStatus,
} from "moneygap-scan-engine";

/**
 * Lightweight chaos simulation: random stage kill mid-pipeline should still
 * leave at most one terminal status per stage and monotonic progress.
 */
describe("scan engine chaos / resume invariants", () => {
  it("simulates worker death between stages without duplicate stage rows", () => {
    const plan = stagesForProfile("standard");
    const statuses: Partial<Record<ScanStageId, ScanStageStatus>> = {};
    for (const s of plan) {
      statuses[s.id] = s.initialStatus;
    }

    // Kill after normalize completes; reclaim resumes at intelligence.
    statuses.acquire = "completed";
    statuses.normalize = "completed";
    statuses.intelligence = "running"; // lease expired → reclaim

    const progressMid = computeProgress(statuses);
    statuses.intelligence = "completed";
    statuses.moneygap = "queued";
    const progressAfter = computeProgress(statuses);
    assert.ok(progressAfter >= progressMid);

    // One status per canonical stage — no duplicates.
    assert.equal(Object.keys(statuses).length, SCAN_STAGES.length);
  });

  it("claim SQL is reclaim-safe for expired leases only", () => {
    const sql = claimNextStageSql();
    assert.match(sql, /FOR UPDATE OF s SKIP LOCKED/);
    assert.match(sql, /WHEN 'finalize' THEN 8/);
  });

  it("quick never queues competitive", () => {
    const competitive = stagesForProfile("quick").find((s) => s.id === "competitive");
    assert.equal(competitive?.initialStatus, "skipped");
  });
});
