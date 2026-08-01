import type { MoneyGapFinding } from "@/lib/analysis/engine/types";

export function synthesizeEvidence(finding: MoneyGapFinding): {
  evidenceSummary: string;
  supportingSignals: string[];
  businessReasoning: string;
  detectionSource: string;
} {
  const evidenceSummary =
    finding.evidenceSummary?.trim() ||
    [
      finding.detectionStatus === "found"
        ? `Signal detected as present (${finding.detectionStatus}).`
        : finding.detectionStatus === "partial"
          ? "Partial signals detected; gap likely incomplete."
          : "No clear implementation of this growth capability was detected on the public site.",
      finding.whatsMissing ? `Missing: ${finding.whatsMissing}` : null,
    ]
      .filter(Boolean)
      .join(" ");

  const supportingSignals =
    finding.supportingSignals && finding.supportingSignals.length > 0
      ? finding.supportingSignals
      : [
          finding.whatsMissing,
          ...(finding.likelyCauses ?? []).slice(0, 2),
          finding.estimateRationale
            ? `Estimate basis: ${finding.estimateRationale.slice(0, 160)}`
            : null,
        ].filter((s): s is string => Boolean(s && s.trim()));

  const businessReasoning =
    finding.businessReasoning?.trim() ||
    [finding.whyItMatters, finding.businessImpact].filter(Boolean).join(" ");

  const detectionSource =
    finding.detectionSource?.trim() || `module:${finding.moduleId}`;

  return {
    evidenceSummary,
    supportingSignals: supportingSignals.slice(0, 6),
    businessReasoning,
    detectionSource,
  };
}
