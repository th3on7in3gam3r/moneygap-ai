import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isQueueDrained,
  pickClaimableIds,
  remainingQueueCount,
} from "./claim";
import {
  estimateEtaSeconds,
  getScanProfile,
  recommendProfile,
  SCAN_PROFILES,
} from "./profiles";

describe("scan profiles", () => {
  it("defines four profiles with increasing page caps", () => {
    assert.equal(SCAN_PROFILES.quick.maxPages, 30);
    assert.equal(SCAN_PROFILES.standard.maxPages, 50);
    assert.equal(SCAN_PROFILES.deep.maxPages, 5_000);
    assert.equal(SCAN_PROFILES.enterprise.maxPages, 50_000);
    assert.equal(SCAN_PROFILES.quick.maxDepth, 2);
    assert.equal(SCAN_PROFILES.standard.maxDepth, 2);
    assert.equal(SCAN_PROFILES.standard.concurrency, 5);
    assert.ok(SCAN_PROFILES.standard.batchSize >= 5);
    assert.ok(SCAN_PROFILES.standard.batchSize <= 15);
    assert.equal(getScanProfile("enterprise").crawlerMode, "deep");
  });

  it("recommends profiles from page counts", () => {
    assert.equal(recommendProfile(20, "low"), "quick");
    assert.equal(recommendProfile(100, "medium"), "standard");
    assert.equal(recommendProfile(2_000, "high"), "deep");
    assert.equal(recommendProfile(20_000, "high"), "enterprise");
  });

  it("caps ETA by profile maxPages", () => {
    const quickEta = estimateEtaSeconds("quick", 10_000);
    const deepEta = estimateEtaSeconds("deep", 10_000);
    assert.ok(quickEta < deepEta);
    assert.ok(quickEta > 0);
  });
});

describe("batch claim helpers", () => {
  it("claims only queued and retry pages up to limit", () => {
    const ids = pickClaimableIds(
      [
        { id: "a", state: "queued" },
        { id: "b", state: "processing" },
        { id: "c", state: "retry" },
        { id: "d", state: "completed" },
        { id: "e", state: "queued" },
      ],
      2,
    );
    assert.deepEqual(ids, ["a", "c"]);
  });

  it("detects drained queues", () => {
    assert.equal(isQueueDrained({ completed: 10, failed: 1 }), true);
    assert.equal(remainingQueueCount({ queued: 2, processing: 1 }), 3);
    assert.equal(isQueueDrained({ queued: 1 }), false);
  });
});
