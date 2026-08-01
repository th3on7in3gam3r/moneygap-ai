import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { KgRule } from "@/db/schema";
import { kgRules } from "@/db/schema";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";

function ruleMatches(
  rule: KgRule,
  classification: ClassificationResult,
  intelligence: IntelligenceResult,
  corpus: string,
): boolean {
  const c = rule.conditions;
  if (c.industry && c.industry !== classification.industrySlug) return false;
  if (c.businessModel && c.businessModel !== classification.businessModelSlug) {
    return false;
  }
  const hay = [
    corpus,
    intelligence.overview,
    JSON.stringify(intelligence.business),
    JSON.stringify(intelligence.monetization ?? {}),
    JSON.stringify(intelligence.trust ?? {}),
  ]
    .join(" ")
    .toLowerCase();

  if (c.presentSignals?.length) {
    if (!c.presentSignals.every((s) => hay.includes(s.toLowerCase()))) return false;
  }
  if (c.missingSignals?.length) {
    const anyMissing = c.missingSignals.some((s) => !hay.includes(s.toLowerCase()));
    if (!anyMissing) return false;
  }
  return true;
}

function findingMatchesActions(
  finding: MoneyGapFinding,
  actions: KgRule["actions"],
): boolean {
  const cat = (finding.category || finding.moduleId || "").toLowerCase();
  const title = finding.title.toLowerCase();
  const moduleId = (finding.moduleId || "").toLowerCase();

  let matched = false;
  if (actions.boostCategories?.length) {
    if (
      actions.boostCategories.some(
        (c) => cat.includes(c.toLowerCase()) || moduleId.includes(c.toLowerCase()),
      )
    ) {
      matched = true;
    }
  }
  if (actions.moduleIds?.length) {
    if (actions.moduleIds.some((m) => moduleId === m.toLowerCase())) matched = true;
  }
  if (actions.titleIncludes?.length) {
    if (actions.titleIncludes.some((t) => title.includes(t.toLowerCase()))) matched = true;
  }
  if (
    !actions.boostCategories?.length &&
    !actions.moduleIds?.length &&
    !actions.titleIncludes?.length
  ) {
    return true;
  }
  return matched;
}

export async function applyKnowledgeRules(
  findings: MoneyGapFinding[],
  classification: ClassificationResult,
  intelligence: IntelligenceResult,
  corpus: string,
): Promise<MoneyGapFinding[]> {
  await ensureKnowledgeCatalog();
  const rules = await db.query.kgRules.findMany({
    where: eq(kgRules.enabled, true),
    orderBy: [desc(kgRules.priority)],
  });

  const active = rules.filter((r) =>
    ruleMatches(r, classification, intelligence, corpus),
  );

  return findings.map((f) => {
    let boost = 0;
    const ruleHits: string[] = [];
    let severity = f.severity;

    for (const rule of active) {
      if (!findingMatchesActions(f, rule.actions)) continue;
      ruleHits.push(rule.slug);
      boost += rule.actions.priorityBoost ?? 8;
      if (rule.actions.severityNudge) {
        const order = ["low", "medium", "high", "critical"] as const;
        const cur = order.indexOf(severity as (typeof order)[number]);
        const want = order.indexOf(rule.actions.severityNudge);
        if (want > cur) severity = rule.actions.severityNudge;
      }
    }

    if (boost <= 0) {
      return {
        ...f,
        kgMeta: {
          industrySlug: classification.industrySlug ?? undefined,
          businessModelSlug: classification.businessModelSlug ?? undefined,
          ruleHits: [],
          priorityBoost: 0,
        },
      };
    }

    const priorityScore = Math.min(100, (f.priorityScore ?? 50) + boost);
    return {
      ...f,
      severity,
      priorityScore,
      kgMeta: {
        industrySlug: classification.industrySlug ?? undefined,
        businessModelSlug: classification.businessModelSlug ?? undefined,
        ruleHits,
        priorityBoost: boost,
      },
    };
  });
}
