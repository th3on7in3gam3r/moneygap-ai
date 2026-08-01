import type { MoneyGapFinding } from "@/lib/analysis/engine/types";

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isContradictoryRecommendWhenFound(finding: MoneyGapFinding) {
  if (finding.detectionStatus !== "found") return false;
  const t = normalizeTitle(finding.title + " " + finding.whatsMissing);
  const recommendWords = ["add ", "missing ", "no ", "lack ", "without ", "create "];
  return recommendWords.some((w) => t.includes(w.trim()) || finding.whatsMissing.toLowerCase().startsWith(w.trim()));
}

/** Merge near-duplicate titles in same module/category; suppress contradictions. */
export function dedupeAndSuppressFindings(findings: MoneyGapFinding[]): {
  findings: MoneyGapFinding[];
  suppressed: { title: string; reason: string }[];
} {
  const suppressed: { title: string; reason: string }[] = [];
  const kept: MoneyGapFinding[] = [];
  const seen = new Map<string, number>();

  for (const raw of findings) {
    if (isContradictoryRecommendWhenFound(raw)) {
      suppressed.push({
        title: raw.title,
        reason: "Contradicts detectionStatus=found (likely false positive).",
      });
      continue;
    }

    const key = `${raw.moduleId}:${normalizeTitle(raw.title)}`;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      const existing = kept[existingIdx]!;
      const mergedFrom = [
        ...(existing.trustMeta?.mergedFrom ?? []),
        raw.title,
      ];
      const winner =
        raw.opportunityIndex > existing.opportunityIndex ? raw : existing;
      const loser =
        raw.opportunityIndex > existing.opportunityIndex ? existing : raw;
      kept[existingIdx] = {
        ...winner,
        supportingSignals: Array.from(
          new Set([
            ...(winner.supportingSignals ?? []),
            ...(loser.supportingSignals ?? []),
            loser.whatsMissing,
          ]),
        ).slice(0, 8),
        trustMeta: {
          ...winner.trustMeta,
          mergedFrom,
          qaFlags: [
            ...new Set([
              ...(winner.trustMeta?.qaFlags ?? []),
              "merged_duplicate",
            ]),
          ],
        },
      };
      suppressed.push({
        title: loser.title,
        reason: "Merged with overlapping finding.",
      });
      continue;
    }

    seen.set(key, kept.length);
    kept.push(raw);
  }

  return { findings: kept, suppressed };
}
