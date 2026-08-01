"use client";

import { useState } from "react";
import type { OpportunityFix } from "@/db/schema";
import { OpportunityActionCenter } from "@/components/action-center/opportunity-action-center";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

export function EstimateBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-gap-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gap",
        className,
      )}
    >
      AI Estimate
    </span>
  );
}

export function FixPlan({ fixes }: { fixes: OpportunityFix[] }) {
  const groups: { tier: OpportunityFix["tier"]; label: string }[] = [
    { tier: "quick_win", label: "Quick Wins" },
    { tier: "medium", label: "Medium Effort" },
    { tier: "long_term", label: "Long-Term Strategy" },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const items = fixes.filter((f) => f.tier === group.tier);
        if (items.length === 0) return null;
        return (
          <div key={group.tier}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
              {group.label}
            </p>
            <ul className="space-y-3">
              {items.map((fix, i) => (
                <li
                  key={`${group.tier}-${i}`}
                  className="rounded-xl border border-border bg-bg px-3.5 py-3"
                >
                  <p className="text-sm font-medium text-fg">{fix.action}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-fg-muted">
                    <span>Difficulty: {fix.difficulty}</span>
                    <span>·</span>
                    <span>Time: {fix.estimatedTime}</span>
                    <span>·</span>
                    <span>Priority: {fix.priority}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                    Expected impact: {fix.expectedImpact}
                  </p>
                  {fix.resources && (
                    <p className="mt-1 text-xs text-fg-subtle">Resources: {fix.resources}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export type OpportunityCardData = {
  id: string;
  title: string;
  category: string;
  moduleId?: string | null;
  detectionStatus?: string | null;
  summary?: string | null;
  whatsMissing: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedAnnualRevenue: number | null;
  estimatedLeads: number | null;
  estimatedTraffic: number | null;
  estimatedConversionLift: number | null;
  estimateRationale: string | null;
  confidence: number;
  likelyCauses: string[] | null;
  fixes: OpportunityFix[] | null;
  helpfulResources?: string[] | null;
  severity: string;
  difficulty?: string | null;
  estimatedTime?: string | null;
  expectedRoi?: number | null;
  opportunityIndex?: number | null;
  priorityScore: number;
  implementationStatus?: string | null;
  lifecycleStatus?: string | null;
  evidenceSummary?: string | null;
  supportingSignals?: string[] | null;
  businessReasoning?: string | null;
  detectionSource?: string | null;
  confidenceLevel?: string | null;
  confidenceIntel?: {
    overall: number;
    engines: {
      business: number;
      developer: number;
      data: number;
      benchmark: number;
      ai: number;
    };
    risk: {
      level: string;
      summary: string;
      breakingChanges: number;
      deployment: number;
      database: number;
      security: number;
      rollbackComplexity: number;
    };
    impact: {
      labeled: "estimated";
      summary: string;
      revenue?: number;
      seo?: number;
      trust?: number;
      conversion?: number;
      authority?: number;
      automation?: number;
    };
    explainability?: {
      evidence: string[];
      benchmarkContext?: string;
      kgRules?: string[];
      businessModelReasoning?: string;
      industryReasoning?: string;
    };
    validationChecklist?: string[];
  } | null;
};

const severityTone: Record<string, "danger" | "gap" | "neutral" | "accent"> = {
  critical: "danger",
  high: "gap",
  medium: "neutral",
  low: "accent",
};

const confidenceTone: Record<string, "accent" | "gap" | "neutral" | "danger"> = {
  very_high: "accent",
  high: "accent",
  medium: "gap",
  low: "neutral",
};

function confidenceLabel(level: string | null | undefined, score: number) {
  if (level === "very_high") return "Very High";
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  if (level === "low") return "Low";
  if (score >= 90) return "Very High";
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function RoiStars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <span className="tabular-nums text-gap" aria-label={`Expected ROI ${stars} of 5`}>
      {"★".repeat(stars)}
      <span className="text-fg-subtle">{"☆".repeat(5 - stars)}</span>
    </span>
  );
}

export function OpportunityCard({
  opportunity,
  defaultOpen = false,
  reportId,
  onAskAdvisor,
}: {
  opportunity: OpportunityCardData;
  defaultOpen?: boolean;
  reportId?: string;
  onAskAdvisor?: (opportunityId: string) => void;
}) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const index = opportunity.opportunityIndex ?? opportunity.priorityScore;
  const detection = opportunity.detectionStatus?.replace("_", " ") ?? null;
  const impl = opportunity.implementationStatus;
  const lifecycle = opportunity.lifecycleStatus;

  async function copyTitle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(opportunity.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 1500);
    } catch {
      /* soft-fail clipboard */
    }
  }

  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-border bg-bg-elevated open:border-border-strong focus-within:ring-2 focus-within:ring-ring"
    >
      <summary
        className="cursor-pointer list-none p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg [&::-webkit-details-marker]:hidden"
        aria-label={`Opportunity: ${opportunity.title}. Confidence ${opportunity.confidence} percent.`}
      >
        <div className="flex flex-wrap items-start gap-2">
          <Badge tone={severityTone[opportunity.severity] ?? "neutral"}>
            {opportunity.severity}
          </Badge>
          <Badge tone="neutral">{opportunity.moduleId ?? opportunity.category}</Badge>
          {detection && <Badge tone="accent">{detection}</Badge>}
          <Badge
            tone={
              confidenceTone[opportunity.confidenceLevel ?? ""] ??
              confidenceTone[
                confidenceLabel(opportunity.confidenceLevel, opportunity.confidence)
                  .toLowerCase()
                  .replace(" ", "_")
              ] ??
              "neutral"
            }
          >
            Confidence {confidenceLabel(opportunity.confidenceLevel, opportunity.confidence)}
          </Badge>
          {lifecycle && lifecycle !== "detected" && (
            <Badge
              tone={
                lifecycle === "completed" ||
                lifecycle === "improved" ||
                lifecycle === "resolved"
                  ? "accent"
                  : "gap"
              }
            >
              {lifecycle.replace("_", " ")}
            </Badge>
          )}
          {impl && impl !== "open" && !lifecycle && (
            <Badge tone={impl === "completed" ? "accent" : "gap"}>
              {impl.replace("_", " ")}
            </Badge>
          )}
          <span className="ml-auto text-[11px] tabular-nums text-fg-subtle">
            Opportunity Index™ {index}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-display text-lg font-semibold tracking-tight text-fg">
            {opportunity.title}
          </h3>
          <button
            type="button"
            onClick={copyTitle}
            aria-label={copiedTitle ? "Problem title copied" : "Copy problem title"}
            title={copiedTitle ? "Copied" : "Copy problem"}
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-fg-subtle transition hover:border-border hover:bg-bg-muted hover:text-fg"
          >
            {copiedTitle ? (
              <Check className="size-3.5 text-accent" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {opportunity.summary ?? opportunity.whatsMissing}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {opportunity.estimatedAnnualRevenue != null &&
            opportunity.estimatedAnnualRevenue > 0 && (
              <p className="inline-flex items-center gap-2 font-display text-xl font-semibold tabular-nums text-gap">
                {formatCurrency(opportunity.estimatedAnnualRevenue)}
                <EstimateBadge />
              </p>
            )}
          {opportunity.expectedRoi != null && (
            <span className="text-xs text-fg-muted">
              Expected ROI <RoiStars value={opportunity.expectedRoi} />
            </span>
          )}
          <span className="text-xs text-fg-subtle" aria-label={`Confidence ${opportunity.confidence} percent`}>
            {opportunity.confidence}%
          </span>
        </div>
      </summary>

      <div className="space-y-5 border-t border-border px-5 py-5">
        {reportId && (
          <OpportunityActionCenter
            reportId={reportId}
            opportunity={opportunity}
            onAskAdvisor={onAskAdvisor}
          />
        )}

        {(opportunity.evidenceSummary ||
          (opportunity.supportingSignals && opportunity.supportingSignals.length > 0) ||
          opportunity.businessReasoning ||
          opportunity.detectionSource) && (
          <section aria-label="Trust and evidence">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
              Trust Engine™
            </h4>
            {opportunity.evidenceSummary && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Evidence
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">
                  {opportunity.evidenceSummary}
                </p>
              </div>
            )}
            {opportunity.supportingSignals && opportunity.supportingSignals.length > 0 && (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-fg-muted">
                {opportunity.supportingSignals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {opportunity.businessReasoning && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Why we recommend this
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                  {opportunity.businessReasoning}
                </p>
              </div>
            )}
            {opportunity.detectionSource && (
              <p className="mt-3 text-xs text-fg-subtle">
                Source of detection:{" "}
                <span className="text-fg">{opportunity.detectionSource}</span>
              </p>
            )}
            {(opportunity.confidenceLevel === "low" || opportunity.confidence < 55) && (
              <p className="mt-2 text-xs text-gap">
                Lower confidence — treat as a hypothesis until you verify on-site.
              </p>
            )}
          </section>
        )}

        {opportunity.confidenceIntel && (
          <section aria-label="Confidence intelligence">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
              Confidence Intelligence™
            </h4>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge tone="accent">
                Overall {opportunity.confidenceIntel.overall}%
              </Badge>
              <Badge
                tone={
                  opportunity.confidenceIntel.risk.level === "high"
                    ? "danger"
                    : opportunity.confidenceIntel.risk.level === "medium"
                      ? "gap"
                      : "neutral"
                }
              >
                Risk {opportunity.confidenceIntel.risk.level}
              </Badge>
              <EstimateBadge />
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              {opportunity.confidenceIntel.risk.summary}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Estimated impact: {opportunity.confidenceIntel.impact.summary}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-fg-subtle">
                Engine breakdown & validation checklist
              </summary>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-fg-muted sm:grid-cols-3">
                {Object.entries(opportunity.confidenceIntel.engines).map(
                  ([k, v]) => (
                    <li key={k}>
                      {k}: {v}%
                    </li>
                  ),
                )}
              </ul>
              {opportunity.confidenceIntel.validationChecklist &&
                opportunity.confidenceIntel.validationChecklist.length > 0 && (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-fg-muted">
                    {opportunity.confidenceIntel.validationChecklist.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
            </details>
          </section>
        )}

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            1. What is missing?
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-fg">{opportunity.whatsMissing}</p>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            2. Why does it matter?
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{opportunity.whyItMatters}</p>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            3. Business impact
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{opportunity.businessImpact}</p>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              4. Estimated Opportunity
            </h4>
            <EstimateBadge />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {opportunity.estimatedAnnualRevenue != null && (
              <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                  Estimated Annual Revenue Opportunity
                </p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-gap">
                  {formatCurrency(opportunity.estimatedAnnualRevenue)}
                </p>
              </div>
            )}
            {opportunity.estimatedLeads != null && (
              <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                  Estimated Lead Opportunity
                </p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-fg">
                  {formatNumber(opportunity.estimatedLeads)}/yr
                </p>
              </div>
            )}
            {opportunity.estimatedTraffic != null && (
              <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                  Estimated Traffic Opportunity
                </p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-fg">
                  {formatNumber(opportunity.estimatedTraffic)}/yr
                </p>
              </div>
            )}
            {opportunity.estimatedConversionLift != null && (
              <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                  Estimated Conversion Opportunity
                </p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-fg">
                  +{opportunity.estimatedConversionLift}%
                </p>
              </div>
            )}
          </div>
          {opportunity.estimateRationale && (
            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
              Derived from website content, industry, business model, visible offerings, and
              comparable businesses. Confidence: {opportunity.confidence}%.{" "}
              {opportunity.estimateRationale}
            </p>
          )}
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            5. Why is it missing?
          </h4>
          <ul className="mt-2 space-y-1.5">
            {(opportunity.likelyCauses ?? []).map((cause) => (
              <li key={cause} className="flex gap-2 text-sm text-fg-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gap" />
                {cause}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            6. How do we fix it?
          </h4>
          <p className="mb-3 text-xs text-fg-muted">
            Pick how to execute in <span className="font-medium text-fg">How to fix</span>{" "}
            above (Action Center, checklist, Developer Mode, Automation, Hub, or Advisor).
          </p>
          <FixPlan fixes={opportunity.fixes ?? []} />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Difficulty</p>
            <p className="mt-1 text-sm font-medium text-fg">
              {opportunity.difficulty ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Est. time</p>
            <p className="mt-1 text-sm font-medium text-fg">
              {opportunity.estimatedTime ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
              Opportunity Index™
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-fg">{index}</p>
          </div>
        </section>

        {(opportunity.helpfulResources ?? []).length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              Helpful resources
            </h4>
            <ul className="mt-2 space-y-1.5">
              {(opportunity.helpfulResources ?? []).map((resource) => (
                <li key={resource} className="text-sm text-fg-muted">
                  {resource}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}
