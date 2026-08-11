import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeProgress,
  firstIncompleteRequired,
  isScanEngineV3Enabled,
  PROFILE_STAGE_MATRIX,
  stagesForProfile,
} from "./stages.js";

describe("scan engine profile matrix", () => {
  it("skips competitive on quick/Basics", () => {
    assert.equal(PROFILE_STAGE_MATRIX.quick.competitive, "skip");
    const stages = stagesForProfile("quick");
    assert.equal(
      stages.find((s) => s.id === "competitive")?.initialStatus,
      "skipped",
    );
    assert.equal(stages.find((s) => s.id === "acquire")?.initialStatus, "queued");
    assert.equal(
      stages.find((s) => s.id === "normalize")?.initialStatus,
      "pending",
    );
    assert.equal(stages.find((s) => s.id === "findings")?.mode, "lite");
    assert.equal(stages.find((s) => s.id === "roadmap")?.mode, "lite");
  });

  it("runs competitive on standard", () => {
    assert.equal(PROFILE_STAGE_MATRIX.standard.competitive, "full");
  });
});

describe("progress + resume helpers", () => {
  it("computes monotonic-ish progress from completed stages", () => {
    const p0 = computeProgress({});
    const p1 = computeProgress({ acquire: "completed", normalize: "completed" });
    assert.ok(p1 > p0);
  });

  it("finds first incomplete required stage", () => {
    assert.equal(
      firstIncompleteRequired({
        acquire: "completed",
        normalize: "completed",
        intelligence: "failed",
      }),
      "intelligence",
    );
  });
});

describe("feature flag", () => {
  it("detects SCAN_ENGINE_V3", () => {
    assert.equal(isScanEngineV3Enabled({ SCAN_ENGINE_V3: "1" }), true);
    assert.equal(isScanEngineV3Enabled({ SCAN_ENGINE_V3: "0" }), false);
  });
});
