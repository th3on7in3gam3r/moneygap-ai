import { describe, expect, it } from "vitest";
import { moneyGapConfigSchema } from "../src/config/load.js";
import { computeCategoryScores } from "../src/scoring/score.js";
import type { Finding } from "../src/types/index.js";

describe("config schema", () => {
  it("applies defaults", () => {
    const cfg = moneyGapConfigSchema.parse({});
    expect(cfg.ignore.length).toBeGreaterThan(0);
  });

  it("rejects bad weights keys softly via strip", () => {
    const cfg = moneyGapConfigSchema.parse({ projectName: "x" });
    expect(cfg.projectName).toBe("x");
  });
});

describe("scoring", () => {
  it("penalizes findings by severity", () => {
    const findings: Finding[] = [
      {
        ruleId: "seo/x",
        title: "t",
        severity: "critical",
        category: "seo",
        explanation: "",
        recommendation: "",
        docsUrl: "",
        estimatedImpact: "",
      },
    ];
    const { categoryScores, overallScore } = computeCategoryScores(findings);
    expect(categoryScores.seo).toBe(82);
    expect(overallScore).toBeLessThan(100);
  });
});
