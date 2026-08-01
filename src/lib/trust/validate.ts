import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import {
  computeConfidenceFactors,
  TRUST_ENGINE_VERSION,
} from "@/lib/trust/confidence";
import { dedupeAndSuppressFindings } from "@/lib/trust/dedupe";
import { synthesizeEvidence } from "@/lib/trust/evidence";
import { runQaChecks, softFixFindings, type QaReport } from "@/lib/trust/qa";

export type TrustEngineContext = {
  corpusChars?: number;
  industryKnown?: boolean;
};

export type TrustEngineResult = {
  findings: MoneyGapFinding[];
  qaReport: QaReport;
  suppressed: { title: string; reason: string }[];
  trustVersion: string;
};

function isTrustEnabled() {
  const v = process.env.FEATURE_TRUST_ENGINE;
  if (v === "0" || v === "false") return false;
  return true;
}

export function runTrustEngine(
  findings: MoneyGapFinding[],
  ctx: TrustEngineContext = {},
): TrustEngineResult {
  if (!isTrustEnabled()) {
    return {
      findings,
      qaReport: { ok: true, issues: [] },
      suppressed: [],
      trustVersion: TRUST_ENGINE_VERSION,
    };
  }

  const enriched = findings.map((f) => {
    const evidence = synthesizeEvidence(f);
    const conf = computeConfidenceFactors({
      confidence: f.confidence,
      detectionStatus: f.detectionStatus,
      hasEvidence: Boolean(evidence.evidenceSummary),
      hasFixes: (f.fixes?.length ?? 0) > 0,
      corpusChars: ctx.corpusChars,
      industryKnown: ctx.industryKnown,
    });

    const level = conf.level;
    const keepLow = f.severity === "critical" || f.opportunityIndex >= 70;
    if (level === "low" && !keepLow) {
      return {
        ...f,
        ...evidence,
        confidenceLevel: level,
        confidence: conf.blended,
        trustMeta: {
          factors: conf.factors,
          suppressed: true,
          suppressReason: "low_confidence",
          qaFlags: ["low_confidence_candidate"],
        },
      } satisfies MoneyGapFinding;
    }

    return {
      ...f,
      ...evidence,
      confidenceLevel: level,
      confidence: conf.blended,
      trustMeta: {
        factors: conf.factors,
        suppressed: false,
        qaFlags: [],
      },
    } satisfies MoneyGapFinding;
  });

  const withoutSuppressed = enriched.filter((f) => !f.trustMeta?.suppressed);
  const lowSuppressed = enriched
    .filter((f) => f.trustMeta?.suppressed)
    .map((f) => ({
      title: f.title,
      reason: f.trustMeta?.suppressReason ?? "suppressed",
    }));

  const { findings: deduped, suppressed: dedupeSuppressed } =
    dedupeAndSuppressFindings(withoutSuppressed);

  const qaReport = runQaChecks(deduped);
  const fixed = softFixFindings(deduped, qaReport.issues);

  return {
    findings: fixed,
    qaReport,
    suppressed: [...lowSuppressed, ...dedupeSuppressed],
    trustVersion: TRUST_ENGINE_VERSION,
  };
}
