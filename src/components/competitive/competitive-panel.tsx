"use client";

import { useState } from "react";
import type {
  CompetitiveAnalysisPayload,
  CompetitorProfileData,
} from "@/db/schema";
import { EstimateDisclaimer } from "@/components/money-gap/disclaimer";
import { UpgradePrompt, type UpgradePayload } from "@/components/billing/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CompetitorView = {
  id: string;
  name: string;
  domain: string;
  url: string | null;
  businessSummary: string | null;
  industry: string | null;
  targetAudience: string | null;
  estimatedCompanySize: string | null;
  profile: CompetitorProfileData | null;
  status: string;
};

const priorityTone: Record<string, "danger" | "gap" | "neutral" | "accent"> = {
  critical: "danger",
  high: "gap",
  medium: "neutral",
  low: "accent",
};

const timeframeLabels: Record<string, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  next_quarter: "Next Quarter",
};

function RetryCompetitiveButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);

  async function onRetry() {
    setLoading(true);
    setMessage(null);
    setUpgrade(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/competitive`, {
        method: "POST",
      });
      const data = (await res.json()) as UpgradePayload & { error?: string };
      if (!res.ok) {
        if (res.status === 403 || data.code === "upgrade_required" || data.code === "usage_limit") {
          setUpgrade(data);
        } else {
          setMessage(data.error ?? "Could not restart Competitive Intelligence.");
        }
        setLoading(false);
        return;
      }
      setMessage("Competitive Intelligence restarted. Refresh this page shortly.");
    } catch {
      setMessage("Could not restart Competitive Intelligence.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onRetry}>
        {loading ? "Starting…" : "Retry Competitive Intelligence"}
      </Button>
      {upgrade && <UpgradePrompt payload={upgrade} compact />}
      {message && <p className="text-xs text-fg-muted">{message}</p>}
    </div>
  );
}

function GapCards({
  title,
  items,
}: {
  title: string;
  items: CompetitiveAnalysisPayload["opportunityGaps"];
}) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {items.map((gap, i) => (
          <details
            key={`${gap.title}-${i}`}
            className="rounded-xl border border-border bg-bg open:border-border-strong"
          >
            <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={priorityTone[gap.priority] ?? "neutral"}>
                  {gap.priority}
                </Badge>
                <span className="text-xs text-fg-subtle">{gap.competitorName}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-fg">{gap.title}</p>
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-4 text-sm">
              <p>
                <span className="text-fg-subtle">Competitor has: </span>
                <span className="text-fg-muted">{gap.competitorHas}</span>
              </p>
              <p>
                <span className="text-fg-subtle">You are missing: </span>
                <span className="text-fg-muted">{gap.userMissing}</span>
              </p>
              <p className="text-fg-muted">{gap.whyItMatters}</p>
              <p className="rounded-lg bg-gap-soft/40 px-3 py-2 text-gap">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
                  AI Estimate
                </span>
                <br />
                {gap.estimatedOpportunity}
              </p>
              <p className="text-fg">
                <span className="font-medium text-accent">Recommendation: </span>
                {gap.recommendation}
              </p>
            </div>
          </details>
        ))}
      </CardBody>
    </Card>
  );
}

export function CompetitiveTabPanel({
  brief,
  analysis,
  competitors,
  engineStatus,
  engineError,
  analysisId,
}: {
  brief: string | null;
  analysis: CompetitiveAnalysisPayload | null;
  competitors: CompetitorView[];
  engineStatus: string | null;
  engineError: string | null;
  analysisId: string | null;
}) {
  const failed = engineStatus === "failed";
  const pending = engineStatus === "pending" || !engineStatus;

  if (failed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-4 space-y-3">
          <p className="text-sm text-fg">
            {engineError ??
              "Competitive Intelligence could not finish. Growth opportunities are still available."}
          </p>
          {analysisId && <RetryCompetitiveButton analysisId={analysisId} />}
        </div>
      </div>
    );
  }

  if (pending && !analysis && competitors.length === 0) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-muted">
            Competitive Intelligence has not finished yet. Run or retry analysis to
            discover named competitors and strategic gaps.
          </p>
          {analysisId && <RetryCompetitiveButton analysisId={analysisId} />}
        </CardBody>
      </Card>
    );
  }

  const categoryAverages = (() => {
    if (!analysis?.headToHead?.length) return [];
    const map = new Map<string, { gapCount: number; highCount: number }>();
    for (const row of analysis.headToHead) {
      const cur = map.get(row.category) ?? { gapCount: 0, highCount: 0 };
      cur.gapCount += 1;
      if (row.priority === "critical" || row.priority === "high") cur.highCount += 1;
      map.set(row.category, cur);
    }
    return Array.from(map.entries()).map(([category, v]) => ({
      category,
      intensity: Math.min(100, Math.round((v.highCount / Math.max(1, v.gapCount)) * 100)),
    }));
  })();

  return (
    <div className="space-y-6">
      {brief && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Executive Competitive Brief
            </h2>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
              {brief}
            </p>
          </CardBody>
        </Card>
      )}

      <EstimateDisclaimer />

      {competitors.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Competitor Overview</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {competitors.length} peers profiled for strategic comparison.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {competitors.map((c) => (
              <details
                key={c.id}
                className="rounded-xl border border-border bg-bg open:border-border-strong"
              >
                <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold text-fg">{c.name}</p>
                    <Badge tone="neutral">{c.domain}</Badge>
                    {c.estimatedCompanySize && (
                      <Badge tone="accent">{c.estimatedCompanySize}</Badge>
                    )}
                  </div>
                  {c.businessSummary && (
                    <p className="mt-2 text-sm text-fg-muted">{c.businessSummary}</p>
                  )}
                </summary>
                <div className="space-y-3 border-t border-border px-4 py-4 text-sm text-fg-muted">
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {c.url}
                    </a>
                  )}
                  <p>
                    <span className="text-fg-subtle">Industry: </span>
                    {c.industry ?? "—"}
                  </p>
                  <p>
                    <span className="text-fg-subtle">Audience: </span>
                    {c.targetAudience ?? "—"}
                  </p>
                  {c.profile && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["Overview", c.profile.businessOverview],
                          ["Revenue model", c.profile.revenueModel],
                          ["Pricing", c.profile.pricingVisibility],
                          ["Lead gen", c.profile.leadGeneration],
                          ["Content", c.profile.contentStrategy],
                          ["Trust", c.profile.trustSignals],
                          ["CTAs", c.profile.callsToAction],
                          ["Newsletter", c.profile.newsletter],
                          ["Community", c.profile.community],
                          ["Digital products", c.profile.digitalProducts],
                          ["Memberships", c.profile.memberships],
                          ["Affiliate", c.profile.affiliateProgram],
                          ["Consulting", c.profile.consulting],
                          ["Automation", c.profile.automation],
                          ["AI features", c.profile.aiFeatures],
                        ] as [string, string][]
                      ).map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                            {label}
                          </p>
                          <p className="mt-1 text-fg">{value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.profile?.overallStrengths?.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
                        Strengths
                      </p>
                      <ul className="mt-2 space-y-1">
                        {c.profile.overallStrengths.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {c.profile?.overallWeaknesses?.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gap">
                        Weaknesses
                      </p>
                      <ul className="mt-2 space-y-1">
                        {c.profile.overallWeaknesses.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </CardBody>
        </Card>
      )}

      {categoryAverages.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Category gap intensity
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Share of high/critical head-to-head gaps by category.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {categoryAverages.map((row) => (
              <div key={row.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">{row.category}</span>
                  <span className="font-semibold tabular-nums text-fg">{row.intensity}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
                  <div
                    className="h-full rounded-full bg-gap transition-all duration-700"
                    style={{ width: `${row.intensity}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {analysis?.headToHead && analysis.headToHead.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Head-to-head comparisons</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {analysis.headToHead.map((row, i) => (
              <div
                key={`${row.competitorDomain}-${row.category}-${i}`}
                className="rounded-xl border border-border bg-bg px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone[row.priority] ?? "neutral"}>
                    {row.priority}
                  </Badge>
                  <Badge tone="neutral">{row.category}</Badge>
                  <span className="text-xs text-fg-subtle">vs {row.competitorName}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">You</p>
                    <p className="mt-1 text-fg-muted">{row.you}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Competitor
                    </p>
                    <p className="mt-1 text-fg-muted">{row.competitor}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Gap</p>
                    <p className="mt-1 text-fg-muted">{row.gap}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-fg-muted">{row.businessImpact}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {analysis && (
        <>
          <GapCards title="Opportunity gaps" items={analysis.opportunityGaps} />
          <GapCards title="Content gaps" items={analysis.contentGaps} />
          <GapCards title="Authority gaps" items={analysis.authorityGaps} />
          <GapCards title="Monetization gaps" items={analysis.monetizationGaps} />
        </>
      )}

      {analysis?.advantages && analysis.advantages.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Your advantages</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Lean into where you are already stronger.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {analysis.advantages.map((a) => (
              <div
                key={a.title}
                className="rounded-xl border border-border bg-bg px-4 py-3"
              >
                <p className="text-sm font-medium text-fg">{a.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{a.description}</p>
                <p className="mt-2 text-sm text-accent">Lean in: {a.howToLeanIn}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {analysis?.swot && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">SWOT</h2>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Strengths", analysis.swot.strengths, "accent"],
                ["Weaknesses", analysis.swot.weaknesses, "gap"],
                ["Opportunities", analysis.swot.opportunities, "accent"],
                ["Threats", analysis.swot.threats, "danger"],
              ] as const
            ).map(([label, items]) => (
              <div key={label} className="rounded-xl border border-border bg-bg px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {label}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Top strategic recommendations
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {analysis.recommendations.map((rec) => (
              <div
                key={rec.rank}
                className="rounded-xl border border-border bg-bg px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-semibold tabular-nums text-fg">
                    #{rec.rank}
                  </span>
                  <Badge tone={priorityTone[rec.priority] ?? "neutral"}>
                    {rec.priority}
                  </Badge>
                  <Badge tone="gap">{rec.expectedRoi}</Badge>
                  <Badge tone="neutral">{rec.easeOfImplementation}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-fg">{rec.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{rec.action}</p>
                <p className="mt-2 text-xs text-fg-subtle">{rec.businessImpact}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {analysis?.opportunityTimeline && analysis.opportunityTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Opportunity timeline</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {(["today", "this_week", "this_month", "next_quarter"] as const).map(
              (tf) => {
                const items = analysis.opportunityTimeline.filter(
                  (t) => t.timeframe === tf,
                );
                if (!items.length) return null;
                return (
                  <div key={tf}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-accent">
                      {timeframeLabels[tf]}
                    </p>
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li
                          key={`${tf}-${i}`}
                          className={cn(
                            "rounded-xl border border-border bg-bg px-4 py-3 text-sm",
                          )}
                        >
                          <p className="font-medium text-fg">{item.title}</p>
                          <p className="mt-1 text-fg-muted">{item.action}</p>
                          <p className="mt-1 text-xs text-fg-subtle">
                            Outcome: {item.expectedOutcome}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              },
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
