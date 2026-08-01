export const TRUST_ENGINE_VERSION = "1.0.0";
export const MONEYGAP_ENGINE_VERSION = "3.1.0";

export type ConfidenceLevel = "very_high" | "high" | "medium" | "low";

export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  const n = Math.max(0, Math.min(100, Math.round(score)));
  if (n >= 90) return "very_high";
  if (n >= 75) return "high";
  if (n >= 55) return "medium";
  return "low";
}

export function confidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "very_high":
      return "Very High";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

export function computeConfidenceFactors(input: {
  confidence: number;
  detectionStatus: string;
  hasEvidence: boolean;
  hasFixes: boolean;
  corpusChars?: number;
  industryKnown?: boolean;
}) {
  const detectionQuality =
    input.detectionStatus === "not_found"
      ? 85
      : input.detectionStatus === "partial"
        ? 65
        : 45;
  const dataCompleteness = Math.min(
    100,
    Math.round(
      (input.hasEvidence ? 35 : 10) +
        (input.hasFixes ? 35 : 10) +
        (input.corpusChars && input.corpusChars > 2000 ? 30 : 15),
    ),
  );
  const industryConfidence = input.industryKnown ? 80 : 55;
  const aiCertainty = Math.max(0, Math.min(100, input.confidence));

  const blended = Math.round(
    detectionQuality * 0.25 +
      dataCompleteness * 0.25 +
      industryConfidence * 0.15 +
      aiCertainty * 0.35,
  );

  return {
    factors: {
      detectionQuality,
      dataCompleteness,
      industryConfidence,
      aiCertainty,
    },
    blended,
    level: confidenceLevelFromScore(blended),
  };
}
