import type { Finding } from "../types/index.js";

export const DOCS = {
  seo: "https://www.moneygap-ai.com/docs",
  aeo: "https://www.moneygap-ai.com/docs",
  performance: "https://www.moneygap-ai.com/docs",
  accessibility: "https://www.moneygap-ai.com/docs",
  trust: "https://www.moneygap-ai.com/docs",
  growth: "https://www.moneygap-ai.com/docs",
};

export function finding(
  partial: Omit<Finding, "docsUrl"> & { docsUrl?: string },
): Finding {
  return {
    docsUrl: partial.docsUrl ?? DOCS[partial.category],
    ...partial,
  };
}

export function filterDisabled(
  findings: Finding[],
  disabled?: string[],
): Finding[] {
  if (!disabled?.length) return findings;
  const set = new Set(disabled);
  return findings.filter((f) => !set.has(f.ruleId));
}
