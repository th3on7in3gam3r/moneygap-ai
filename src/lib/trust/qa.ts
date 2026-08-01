import type { MoneyGapFinding } from "@/lib/analysis/engine/types";

export type QaIssue = {
  code: string;
  message: string;
  title?: string;
};

export type QaReport = {
  ok: boolean;
  issues: QaIssue[];
};

export function runQaChecks(findings: MoneyGapFinding[]): QaReport {
  const issues: QaIssue[] = [];

  const titles = new Map<string, number>();
  for (const f of findings) {
    const key = f.title.toLowerCase().trim();
    titles.set(key, (titles.get(key) ?? 0) + 1);

    if (!f.whatsMissing?.trim()) {
      issues.push({
        code: "missing_whats_missing",
        message: "Finding lacks whatsMissing.",
        title: f.title,
      });
    }
    if (!f.whyItMatters?.trim() && !f.businessImpact?.trim()) {
      issues.push({
        code: "missing_explanation",
        message: "Finding lacks business explanation.",
        title: f.title,
      });
    }
    if (!f.fixes || f.fixes.length === 0) {
      issues.push({
        code: "missing_fixes",
        message: "Finding has no recommendations/fixes.",
        title: f.title,
      });
    }
    if (
      f.estimatedAnnualRevenue != null &&
      (f.estimatedAnnualRevenue < 0 || f.estimatedAnnualRevenue > 50_000_000)
    ) {
      issues.push({
        code: "invalid_estimate",
        message: "Revenue estimate out of sane bounds.",
        title: f.title,
      });
    }
    if (f.confidence < 0 || f.confidence > 100) {
      issues.push({
        code: "invalid_confidence",
        message: "Confidence outside 0–100.",
        title: f.title,
      });
    }
    if (f.opportunityIndex < 0 || f.opportunityIndex > 100) {
      issues.push({
        code: "invalid_opportunity_index",
        message: "Opportunity Index outside 0–100.",
        title: f.title,
      });
    }
  }

  for (const [title, count] of titles) {
    if (count > 1) {
      issues.push({
        code: "duplicate_title",
        message: `Duplicate title appears ${count} times.`,
        title,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Soft-fix findings that fail critical QA. */
export function softFixFindings(
  findings: MoneyGapFinding[],
  issues: QaIssue[],
): MoneyGapFinding[] {
  const badTitles = new Set(
    issues
      .filter((i) =>
        ["missing_whats_missing", "invalid_confidence", "invalid_opportunity_index"].includes(
          i.code,
        ),
      )
      .map((i) => i.title?.toLowerCase()),
  );

  return findings
    .filter((f) => !badTitles.has(f.title.toLowerCase()))
    .map((f) => {
      const flags = [...(f.trustMeta?.qaFlags ?? [])];
      if (!f.fixes?.length) flags.push("missing_fixes");
      if (!f.evidenceSummary) flags.push("synthesized_evidence");
      return {
        ...f,
        confidence: Math.max(0, Math.min(100, f.confidence)),
        opportunityIndex: Math.max(0, Math.min(100, f.opportunityIndex)),
        estimatedAnnualRevenue:
          f.estimatedAnnualRevenue != null && f.estimatedAnnualRevenue < 0
            ? null
            : f.estimatedAnnualRevenue,
        trustMeta: {
          ...f.trustMeta,
          qaFlags: [...new Set(flags)],
        },
      };
    });
}
