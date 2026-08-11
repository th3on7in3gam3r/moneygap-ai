import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimNextStageSql,
  computeProgress,
  firstIncompleteRequired,
  isScanEngineV3Enabled,
  stagesForProfile,
} from "moneygap-scan-engine";
import { isV3AnalysisMeta } from "./status";
import { resolveProviderOrder } from "@/lib/scan/crawlers/router";

describe("scan engine v3 wiring", () => {
  it("detects v3 meta", () => {
    assert.equal(isV3AnalysisMeta({ scanEngine: "v3" }), true);
    assert.equal(isV3AnalysisMeta({}), false);
    assert.equal(isV3AnalysisMeta(null), false);
  });

  it("claim SQL only targets queued or expired running leases", () => {
    const sql = claimNextStageSql();
    assert.match(sql, /s\.status = 'queued'/);
    assert.match(sql, /lease_expires_at < NOW\(\)/);
    assert.doesNotMatch(sql, /s\.status IN \('queued', 'running', 'pending'\)/);
    assert.match(sql, /WHEN 'acquire' THEN 1/);
  });

  it("resume helper prefers first incomplete required stage", () => {
    assert.equal(
      firstIncompleteRequired({
        acquire: "completed",
        normalize: "completed",
        intelligence: "completed",
        moneygap: "queued",
      }),
      "moneygap",
    );
  });

  it("quick profile progress skips competitive weight as skipped", () => {
    const plan = stagesForProfile("quick");
    assert.ok(plan.every((s) => s.id !== "competitive" || s.mode === "skip"));
    const p = computeProgress({
      acquire: "completed",
      normalize: "completed",
      intelligence: "completed",
      moneygap: "completed",
      findings: "completed",
      roadmap: "completed",
      competitive: "skipped",
      finalize: "completed",
    });
    assert.ok(p >= 99);
  });
});

describe("BASIC fast acquire routing", () => {
  it("puts Apify after Firecrawl/native for quick auto", () => {
    const order = resolveProviderOrder("auto", "quick");
    const apifyIdx = order.indexOf("apify");
    if (apifyIdx >= 0) {
      assert.ok(apifyIdx > order.indexOf("native") || order[0] === "firecrawl");
      assert.notEqual(order[0], "apify");
    } else {
      assert.ok(order.includes("native"));
    }
  });

  it("keeps Apify-primary for standard auto when configured", () => {
    // Without credentials this may be native-only; just ensure quick differs when both exist.
    const quick = resolveProviderOrder("auto", "quick");
    const standard = resolveProviderOrder("auto", "standard");
    if (quick.includes("apify") && standard.includes("apify")) {
      assert.ok(quick.indexOf("apify") >= quick.indexOf("native"));
      assert.equal(standard[0], "apify");
    }
  });
});

describe("flag", () => {
  it("reads SCAN_ENGINE_V3", () => {
    assert.equal(isScanEngineV3Enabled({ SCAN_ENGINE_V3: "true" }), true);
  });
});
