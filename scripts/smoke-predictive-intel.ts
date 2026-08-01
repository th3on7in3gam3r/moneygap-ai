import { scorePredictionConfidence } from "../src/lib/predictive/confidence";
import { simulateWhatIf } from "../src/lib/predictive/what-if";
import { isPredictiveIntelEnabled } from "../src/lib/predictive/flag";
import { forecastGrowth } from "../src/lib/predictive/forecast-growth";
import type { PredictiveFeedContext } from "../src/lib/predictive/types";

function flagEnabled(v: string | undefined) {
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
if (!flagEnabled(undefined)) throw new Error("enabled by default");
if (flagEnabled("0")) throw new Error("flag soft-skip");
void isPredictiveIntelEnabled();

const conf = scorePredictionConfidence({
  evidenceCount: 4,
  snapshotCount: 3,
  softFailNotes: 1,
  horizon: "30d",
});
if (conf < 40 || conf > 95) throw new Error(`confidence out of range: ${conf}`);

const emptyCtx: PredictiveFeedContext = {
  notes: ["thin history"],
  websiteId: null,
  websiteName: null,
  websiteDomain: null,
  scores: [
    { moneyGapScore: 62, revenueAtRisk: 40000, createdAt: new Date() },
    { moneyGapScore: 55, revenueAtRisk: 35000, createdAt: new Date() },
  ],
  latestScore: 62,
  scoreTrend: 7,
  openGaps: [
    {
      id: "1",
      title: "Lack of testimonials",
      moduleId: "trust",
      category: "Trust",
      severity: "high",
      opportunityIndex: 72,
      estimatedAnnualRevenue: 50000,
      reportId: "r1",
    },
  ],
  competitorNotes: [],
  industrySlug: "saas",
  hubConnectedCount: 0,
};

const growth = forecastGrowth(emptyCtx);
if (!growth.prediction || !growth.evidence.length) {
  throw new Error("growth forecast incomplete");
}
if (growth.impactEstimate.labeled !== "AI Estimate") {
  throw new Error("must label AI Estimate");
}
if (!growth.recommendedAction) throw new Error("missing action");
if (!growth.horizon) throw new Error("missing horizon");

const whatIf = simulateWhatIf({
  inputs: {
    conversionLiftPct: 10,
    trafficGrowthPct: 20,
    pricingChangePct: 5,
    contentProductionBoostPct: 15,
    automationAdoptionPct: 30,
  },
  baseScore: 62,
  baseRevenueAtRisk: 40000,
});
if (whatIf.labeled !== "AI Estimate") throw new Error("what-if label");
if (whatIf.horizons.length < 2) throw new Error("need multiple horizons");
if (whatIf.confidence < 1) throw new Error("what-if confidence");

console.log("predictive-intel smoke OK", {
  conf,
  growthKind: growth.kind,
  horizons: whatIf.horizons.map((h) => h.horizon),
});
