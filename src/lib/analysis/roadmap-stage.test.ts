import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGrowthRoadmap } from "./engine/roadmap";
import type { MoneyGapFinding } from "./engine/types";
import {
  classifyRoadmapError,
  DEFAULT_MONEYGAP_ENGINE_DEADLINE_MS,
  getMoneyGapEngineDeadlineMs,
  isMoneyGapClaimFresh,
  MAX_PERSISTED_OPPORTUNITIES,
  MONEYGAP_CLAIM_FRESH_MS,
  MODULE_CORPUS_MAX_CHARS,
} from "./roadmap-errors";
import { ANALYSIS_STAGES } from "./stages";

function finding(
  partial: Partial<MoneyGapFinding> & {
    title: string;
    moduleId: MoneyGapFinding["moduleId"];
  },
): MoneyGapFinding {
  return {
    category: partial.moduleId,
    detectionStatus: "found",
    summary: partial.title,
    whatsMissing: "gap",
    whyItMatters: "matters",
    businessImpact: "impact",
    estimatedAnnualRevenue: 1000,
    estimatedLeads: 10,
    estimatedTraffic: 100,
    estimatedConversionLift: 5,
    estimateRationale: "est",
    confidence: 70,
    likelyCauses: [],
    fixes: [
      {
        tier: "quick_win",
        action: "Do the thing",
        expectedImpact: "More revenue",
        difficulty: "easy",
        estimatedTime: "1d",
        priority: "high",
        resources: null,
      },
    ],
    helpfulResources: [],
    severity: "high",
    difficulty: "easy",
    estimatedTime: "1d",
    expectedRoi: 4,
    opportunityIndex: 80,
    priorityScore: 80,
    ...partial,
  };
}

describe("roadmap stage limits", () => {
  it("builds bounded roadmap buckets from findings", () => {
    const findings = Array.from({ length: 30 }, (_, i) =>
      finding({
        title: `Gap ${i}`,
        moduleId: i % 2 === 0 ? "revenue" : "seo",
        opportunityIndex: 90 - i,
      }),
    );
    const roadmap = buildGrowthRoadmap(findings);
    const total =
      roadmap.today.length +
      roadmap.thisWeek.length +
      roadmap.thisMonth.length +
      roadmap.nextQuarter.length;
    assert.ok(total <= 17);
    assert.ok(roadmap.today.length <= 3);
    assert.ok(MAX_PERSISTED_OPPORTUNITIES >= 10);
  });

  it("module corpus budget is compact (not full dump)", () => {
    assert.ok(MODULE_CORPUS_MAX_CHARS <= 30_000);
    assert.ok(MODULE_CORPUS_MAX_CHARS < 45_000);
  });

  it("engine deadline defaults to ~4.5 minutes", () => {
    const prev = process.env.MONEYGAP_ENGINE_DEADLINE_MS;
    delete process.env.MONEYGAP_ENGINE_DEADLINE_MS;
    assert.equal(getMoneyGapEngineDeadlineMs(), DEFAULT_MONEYGAP_ENGINE_DEADLINE_MS);
    process.env.MONEYGAP_ENGINE_DEADLINE_MS = "120000";
    assert.equal(getMoneyGapEngineDeadlineMs(), 120_000);
    if (prev === undefined) delete process.env.MONEYGAP_ENGINE_DEADLINE_MS;
    else process.env.MONEYGAP_ENGINE_DEADLINE_MS = prev;
  });
});

describe("roadmap error classification", () => {
  it("maps timeout / rate / json / deadline", () => {
    assert.equal(
      classifyRoadmapError(new Error("The operation was aborted due to timeout")),
      "ROADMAP_AI_TIMEOUT",
    );
    assert.equal(classifyRoadmapError(new Error("Rate limit 429")), "ROADMAP_AI_RATE_LIMIT");
    assert.equal(
      classifyRoadmapError(new Error("Unexpected token in JSON")),
      "ROADMAP_INVALID_JSON",
    );
    assert.equal(
      classifyRoadmapError(new Error("Money Gap engine deadline exceeded")),
      "ROADMAP_DEADLINE",
    );
    assert.equal(
      classifyRoadmapError(new Error("duplicate key value violates unique")),
      "ROADMAP_PERSIST_ERROR",
    );
  });
});

describe("money gap claim freshness", () => {
  it("blocks duplicate invocation while claim is fresh", () => {
    const now = 1_000_000;
    assert.equal(
      isMoneyGapClaimFresh({
        claimedAt: now - 30_000,
        lastProgressAt: now - 10_000,
        now,
      }),
      true,
    );
    assert.equal(
      isMoneyGapClaimFresh({
        claimedAt: now - MONEYGAP_CLAIM_FRESH_MS - 1,
        lastProgressAt: now - 10_000,
        now,
      }),
      false,
    );
    assert.equal(
      isMoneyGapClaimFresh({
        claimedAt: now - 30_000,
        lastProgressAt: now - MONEYGAP_CLAIM_FRESH_MS - 1,
        now,
      }),
      false,
    );
  });
});

describe("stage progress monotonicity for roadmap heartbeats", () => {
  function resolveLikeApi(stage: string, progress: number): number {
    const byLabel = ANALYSIS_STAGES.findIndex((s) => s.label === stage);
    if (byLabel >= 0) return byLabel;
    const lower = stage.toLowerCase();
    if (
      lower.includes("building fix roadmap") ||
      lower.includes("saving growth roadmap") ||
      lower.includes("growth roadmap") ||
      lower.includes("opportunity intelligence")
    ) {
      return ANALYSIS_STAGES.findIndex((s) => s.id === "action_plans");
    }
    if (lower.includes("deepening category")) {
      return ANALYSIS_STAGES.findIndex((s) => s.id === "quantifying");
    }
    if (
      lower.includes("scoring moneygap") ||
      lower.includes("opportunity module") ||
      lower.includes("crawlability")
    ) {
      return ANALYSIS_STAGES.findIndex((s) => s.id === "detecting_gaps");
    }
    let best = 0;
    for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
      if (ANALYSIS_STAGES[i]!.progress <= progress) best = i;
    }
    return best;
  }

  it("maps module scoring before fix roadmap", () => {
    const a = resolveLikeApi("Scoring MoneyGap Categories™… 4 of 11", 80);
    const b = resolveLikeApi("Deepening category findings…", 86);
    const c = resolveLikeApi("Building Fix Roadmap… 12 actions prepared", 90);
    assert.ok(a <= b);
    assert.ok(b <= c);
    assert.equal(
      ANALYSIS_STAGES[a]!.id,
      "detecting_gaps",
    );
    assert.equal(ANALYSIS_STAGES[c]!.id, "action_plans");
  });

  it("partial findings still produce a non-empty roadmap", () => {
    const roadmap = buildGrowthRoadmap([
      finding({ title: "Only one", moduleId: "revenue", opportunityIndex: 88 }),
    ]);
    assert.ok(
      roadmap.today.length +
        roadmap.thisWeek.length +
        roadmap.thisMonth.length +
        roadmap.nextQuarter.length >=
        1,
    );
  });
});
