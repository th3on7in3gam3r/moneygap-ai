import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countByGoldenCategory,
  GOLDEN_CATEGORY_IDS,
  moduleToGoldenCategory,
  rollupCategoryScores,
} from "./categories.js";

describe("golden categories", () => {
  it("maps all eleven modules to a golden category", () => {
    assert.equal(moduleToGoldenCategory("revenue"), "revenue");
    assert.equal(moduleToGoldenCategory("marketing"), "offer");
    assert.equal(moduleToGoldenCategory("conversion"), "conversion");
    assert.equal(moduleToGoldenCategory("automation"), "conversion");
    assert.equal(moduleToGoldenCategory("trust"), "trust");
    assert.equal(moduleToGoldenCategory("authority"), "trust");
    assert.equal(moduleToGoldenCategory("customer"), "trust");
    assert.equal(moduleToGoldenCategory("content"), "content");
    assert.equal(moduleToGoldenCategory("ai"), "ai_visibility");
    assert.equal(moduleToGoldenCategory("seo"), "technical");
    assert.equal(moduleToGoldenCategory("competitive"), "technical");
    assert.equal(moduleToGoldenCategory("unknown"), "technical");
  });

  it("averages constituent module scores", () => {
    const scores = {
      revenue: 80,
      authority: 60,
      seo: 40,
      content: 50,
      trust: 70,
      conversion: 90,
      marketing: 30,
      automation: 50,
      customer: 50,
      ai: 20,
      competitive: 60,
    };
    const rolled = rollupCategoryScores(scores);
    assert.equal(rolled.revenue, 80);
    assert.equal(rolled.offer, 30);
    assert.equal(rolled.conversion, 70);
    assert.equal(rolled.trust, 60);
    assert.equal(rolled.content, 50);
    assert.equal(rolled.ai_visibility, 20);
    assert.equal(rolled.technical, 50);
    assert.equal(GOLDEN_CATEGORY_IDS.length, 7);
  });

  it("counts findings by golden category", () => {
    const counts = countByGoldenCategory([
      { moduleId: "revenue" },
      { moduleId: "marketing" },
      { moduleId: "seo" },
      { moduleId: "competitive" },
      { moduleId: "trust" },
    ]);
    assert.equal(counts.revenue, 1);
    assert.equal(counts.offer, 1);
    assert.equal(counts.technical, 2);
    assert.equal(counts.trust, 1);
    assert.equal(counts.conversion, 0);
  });
});
