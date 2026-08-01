import type { ConfidenceIntelJson } from "@/db/schema";
import type { FindingLike } from "@/lib/confidence/types";

/** Explainability™ assembly from Trust + KG fields */
export function buildExplainability(
  f: FindingLike,
): ConfidenceIntelJson["explainability"] {
  const evidence: string[] = [];
  if (f.evidenceSummary) evidence.push(f.evidenceSummary);
  for (const s of f.supportingSignals ?? []) {
    if (s && !evidence.includes(s)) evidence.push(s);
  }
  if (evidence.length === 0 && f.whatsMissing) {
    evidence.push(`Gap signal: ${f.whatsMissing.slice(0, 160)}`);
  }

  const kgRules = [
    ...(f.kgMeta?.ruleHits ?? []),
    ...(f.kgMeta?.patternHits ?? []).map((p) => `pattern:${p}`),
  ];

  const benchmarkParts = [
    f.kgMeta?.industryFitNote,
    f.kgMeta?.businessModelFitNote,
    f.kgMeta?.patternFitNote,
  ].filter(Boolean) as string[];

  return {
    evidence: evidence.slice(0, 8),
    benchmarkContext:
      benchmarkParts.length > 0 ? benchmarkParts.join(" ") : undefined,
    kgRules: kgRules.length > 0 ? kgRules.slice(0, 12) : undefined,
    businessModelReasoning:
      f.businessReasoning ||
      f.kgMeta?.businessModelFitNote ||
      undefined,
    industryReasoning: f.kgMeta?.industryFitNote || undefined,
  };
}
