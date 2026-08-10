import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedScanProfiles,
  planAllowsScanProfile,
  suggestedPlanForScanProfile,
} from "./catalog";

describe("allowedScanProfiles", () => {
  it("limits Free to quick / Basics only", () => {
    assert.deepEqual(allowedScanProfiles("free"), ["quick"]);
    assert.equal(planAllowsScanProfile("free", "quick"), true);
    assert.equal(planAllowsScanProfile("free", "standard"), false);
    assert.equal(planAllowsScanProfile("free", "deep"), false);
  });

  it("unlocks standard and deep on Starter+", () => {
    assert.deepEqual(allowedScanProfiles("starter"), [
      "quick",
      "standard",
      "deep",
    ]);
    assert.equal(planAllowsScanProfile("growth", "deep"), true);
    assert.equal(planAllowsScanProfile("starter", "enterprise"), false);
  });

  it("allows enterprise profile on Enterprise plan", () => {
    assert.ok(allowedScanProfiles("enterprise").includes("enterprise"));
    assert.equal(suggestedPlanForScanProfile("standard"), "starter");
    assert.equal(suggestedPlanForScanProfile("enterprise"), "enterprise");
  });
});
