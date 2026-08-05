import { describe, expect, it } from "vitest";
import { computeOpportunityScore } from "./opportunity-score";
import { classifySearchIntent } from "../search-intent/classify";

describe("Opportunity Score™", () => {
  it("scores high-value low-effort opportunities higher", () => {
    const high = computeOpportunityScore({
      businessValue: 0.95,
      revenuePotential: 0.9,
      searchDemand: 0.8,
      competition: 0.2,
      implementationEffort: 0.2,
      aiVisibility: 0.85,
      topicalAuthority: 0.8,
    });
    const low = computeOpportunityScore({
      businessValue: 0.3,
      revenuePotential: 0.2,
      searchDemand: 0.2,
      competition: 0.9,
      implementationEffort: 0.9,
      aiVisibility: 0.2,
      topicalAuthority: 0.2,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });
});

describe("search intent", () => {
  it("classifies transactional and comparison terms", () => {
    expect(classifySearchIntent("pricing for consulting")).toBe("transactional");
    expect(classifySearchIntent("best crm vs hubspot")).toBe("comparison");
  });
});
