"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ConfidenceIntelJson, OpportunityFix } from "@/db/schema";
import { OpportunityCard } from "@/components/money-gap/opportunity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  GOLDEN_CATEGORIES,
  type GoldenCategoryId,
  moduleToGoldenCategory,
} from "@/lib/moneygap/categories";
import { formatCurrency } from "@/lib/utils";

export type MoneyGapBoardItem = {
  id: string;
  reportId: string;
  websiteId: string;
  websiteLabel: string;
  title: string;
  category: string;
  moduleId: string;
  detectionStatus: string;
  summary: string | null;
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
  fixes: OpportunityFix[];
  helpfulResources: string[] | null;
  severity: string;
  difficulty: string;
  estimatedTime: string | null;
  expectedRoi: number;
  opportunityIndex: number;
  priorityScore: number;
  implementationStatus: string;
  lifecycleStatus: string;
  evidenceSummary: string | null;
  supportingSignals: string[] | null;
  businessReasoning: string | null;
  detectionSource: string | null;
  confidenceLevel: string | null;
  confidenceIntel: ConfidenceIntelJson | null;
};

export type MoneyGapWebsiteOption = {
  id: string;
  label: string;
};

export type MoneyGapPortfolio = {
  open: number;
  completed: number;
  total: number;
  captured: number;
  remaining: number;
};

export function MoneyGapsBoard({
  opportunities,
  websites,
  portfolio,
}: {
  opportunities: MoneyGapBoardItem[];
  websites: MoneyGapWebsiteOption[];
  portfolio: MoneyGapPortfolio | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const focusOpportunity = searchParams.get("opportunity")?.trim() || "";
  const websiteParam = searchParams.get("website")?.trim() || "";
  const [categoryFilter, setCategoryFilter] = useState<"all" | GoldenCategoryId>(
    "all",
  );

  const defaultWebsiteId = useMemo(() => {
    if (websites.length === 0) return "all";
    if (websites.length === 1) return websites[0]!.id;
    const counts = new Map<string, number>();
    for (const o of opportunities) {
      counts.set(o.websiteId, (counts.get(o.websiteId) ?? 0) + 1);
    }
    let best = websites[0]!.id;
    let bestCount = -1;
    for (const w of websites) {
      const n = counts.get(w.id) ?? 0;
      if (n > bestCount) {
        best = w.id;
        bestCount = n;
      }
    }
    return best;
  }, [opportunities, websites]);

  const websiteId = useMemo(() => {
    if (focusOpportunity) {
      const match = opportunities.find((o) => o.id === focusOpportunity);
      if (match) return match.websiteId;
    }
    if (websiteParam === "all") return "all";
    if (websiteParam && websites.some((w) => w.id === websiteParam)) {
      return websiteParam;
    }
    return defaultWebsiteId;
  }, [
    defaultWebsiteId,
    focusOpportunity,
    opportunities,
    websiteParam,
    websites,
  ]);

  const filtered = useMemo(() => {
    let rows = opportunities;
    if (websiteId !== "all") {
      rows = rows.filter((o) => o.websiteId === websiteId);
    }
    if (categoryFilter !== "all") {
      rows = rows.filter(
        (o) => moduleToGoldenCategory(o.moduleId) === categoryFilter,
      );
    }
    return rows;
  }, [opportunities, websiteId, categoryFilter]);

  const totalImpact = useMemo(
    () =>
      filtered.reduce((s, o) => s + (o.estimatedAnnualRevenue ?? 0), 0),
    [filtered],
  );

  const selectedLabel =
    websiteId === "all"
      ? "all websites"
      : (websites.find((w) => w.id === websiteId)?.label ?? "this website");

  function setWebsite(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultWebsiteId && !focusOpportunity) {
      params.delete("website");
    } else {
      params.set("website", next);
    }
    // Clear stale opportunity deep-link when manually changing site
    if (focusOpportunity) {
      const match = opportunities.find((o) => o.id === focusOpportunity);
      if (!match || (next !== "all" && match.websiteId !== next)) {
        params.delete("opportunity");
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/dashboard/money-gaps?${qs}` : "/dashboard/money-gaps", {
        scroll: false,
      });
    });
  }

  const showPortfolioAll = websiteId === "all" && portfolio && portfolio.total > 0;
  const showPortfolioSite = websiteId !== "all" && filtered.length > 0;

  const groups = useMemo(() => {
    if (websiteId !== "all") {
      return [{ id: websiteId, label: selectedLabel, items: filtered }];
    }
    const bySite = new Map<string, MoneyGapBoardItem[]>();
    for (const o of filtered) {
      const list = bySite.get(o.websiteId) ?? [];
      list.push(o);
      bySite.set(o.websiteId, list);
    }
    return websites
      .map((w) => ({
        id: w.id,
        label: w.label,
        items: bySite.get(w.id) ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered, selectedLabel, websiteId, websites]);

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="font-display text-lg font-semibold">No open gaps</p>
          <p className="mt-2 text-sm text-fg-muted">
            Analyze a website to surface real Money Gaps. We do not show sample
            findings in your workspace.
          </p>
          <div className="mt-5">
            <Button href="/dashboard/analyze" size="sm">
              Analyze New Website
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-fg-subtle">Website</span>
          <select
            className="min-w-[14rem] rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={websiteId}
            disabled={pending || websites.length === 0}
            onChange={(e) => setWebsite(e.target.value)}
          >
            {websites.length > 1 ? (
              <option value="all">All websites ({opportunities.length})</option>
            ) : null}
            {websites.map((w) => {
              const count = opportunities.filter(
                (o) => o.websiteId === w.id,
              ).length;
              return (
                <option key={w.id} value={w.id}>
                  {w.label}
                  {count > 0 ? ` (${count})` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
            Estimated annual opportunity
          </p>
          <p className="font-display text-2xl font-semibold tabular-nums text-gap">
            {formatCurrency(totalImpact)}
          </p>
          <p className="mt-0.5 text-[11px] text-fg-subtle">for {selectedLabel}</p>
        </div>
      </div>

      {showPortfolioAll ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PortfolioStat label="Open" value={String(portfolio!.open)} />
          <PortfolioStat label="Completed" value={String(portfolio!.completed)} />
          <PortfolioStat label="Total" value={String(portfolio!.total)} />
          <PortfolioStat
            label="Captured"
            value={formatCurrency(portfolio!.captured, { compact: true })}
            tone="accent"
          />
          <PortfolioStat
            label="Remaining"
            value={formatCurrency(portfolio!.remaining, { compact: true })}
            tone="gap"
          />
        </div>
      ) : null}

      {showPortfolioSite ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PortfolioStat label="Open" value={String(filtered.length)} />
          <PortfolioStat
            label="Remaining"
            value={formatCurrency(totalImpact, { compact: true })}
            tone="gap"
          />
          <PortfolioStat
            label="Avg opportunity index"
            value={String(
              Math.round(
                filtered.reduce((s, o) => s + (o.opportunityIndex ?? 0), 0) /
                  filtered.length,
              ),
            )}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            categoryFilter === "all"
              ? "bg-accent-soft text-accent"
              : "text-fg-muted hover:bg-bg-muted"
          }`}
        >
          All categories
        </button>
        {GOLDEN_CATEGORIES.map((cat) => {
          const n = opportunities.filter(
            (o) =>
              (websiteId === "all" || o.websiteId === websiteId) &&
              moduleToGoldenCategory(o.moduleId) === cat.id,
          ).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                categoryFilter === cat.id
                  ? "bg-accent-soft text-accent"
                  : "text-fg-muted hover:bg-bg-muted"
              }`}
            >
              {cat.shortLabel}
              {n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-10 text-center">
            <p className="font-display text-lg font-semibold">
              No open gaps for {selectedLabel}
            </p>
            <p className="text-sm text-fg-muted">
              Switch websites above, or run a new analysis to surface Money Gaps
              for this site.
            </p>
            <div className="pt-2">
              <Button href="/dashboard/analyze" size="sm">
                Analyze New Website
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone="gap">Opportunity-first</Badge>
            <Badge tone="neutral">
              {filtered.length} open gap{filtered.length === 1 ? "" : "s"}
            </Badge>
            <Badge tone="accent">AI Estimate</Badge>
            {websiteId !== "all" ? (
              <Badge tone="neutral">{selectedLabel}</Badge>
            ) : null}
          </div>

          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.id} className="space-y-4">
                {websiteId === "all" || websites.length > 1 ? (
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <h2 className="font-display text-lg font-semibold tracking-tight">
                        {group.label}
                      </h2>
                      <p className="text-xs text-fg-subtle">
                        {group.items.length} open gap
                        {group.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {websiteId === "all" ? (
                      <button
                        type="button"
                        className="text-xs text-accent hover:underline"
                        onClick={() => setWebsite(group.id)}
                      >
                        View only this site →
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-4">
                  {group.items.map((o, index) => (
                    <div key={o.id} className="space-y-2">
                      <div className="flex items-center justify-end gap-2 text-xs text-fg-subtle">
                        {o.reportId ? (
                          <Link
                            href={`/reports/${o.reportId}`}
                            className="text-accent hover:underline"
                          >
                            Open report →
                          </Link>
                        ) : null}
                      </div>
                      <OpportunityCard
                        defaultOpen={
                          focusOpportunity
                            ? o.id === focusOpportunity
                            : websiteId !== "all" && index === 0
                        }
                        reportId={o.reportId}
                        opportunity={{
                          id: o.id,
                          title: o.title,
                          category: o.category,
                          moduleId: o.moduleId,
                          detectionStatus: o.detectionStatus,
                          summary: o.summary,
                          whatsMissing: o.whatsMissing,
                          whyItMatters: o.whyItMatters,
                          businessImpact: o.businessImpact,
                          estimatedAnnualRevenue: o.estimatedAnnualRevenue,
                          estimatedLeads: o.estimatedLeads,
                          estimatedTraffic: o.estimatedTraffic,
                          estimatedConversionLift: o.estimatedConversionLift,
                          estimateRationale: o.estimateRationale,
                          confidence: o.confidence,
                          likelyCauses: o.likelyCauses,
                          fixes: o.fixes,
                          helpfulResources: o.helpfulResources,
                          severity: o.severity,
                          difficulty: o.difficulty,
                          estimatedTime: o.estimatedTime,
                          expectedRoi: o.expectedRoi,
                          opportunityIndex: o.opportunityIndex,
                          priorityScore: o.priorityScore,
                          implementationStatus: o.implementationStatus,
                          lifecycleStatus: o.lifecycleStatus,
                          evidenceSummary: o.evidenceSummary,
                          supportingSignals: o.supportingSignals,
                          businessReasoning: o.businessReasoning,
                          detectionSource: o.detectionSource,
                          confidenceLevel: o.confidenceLevel,
                          confidenceIntel: o.confidenceIntel,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PortfolioStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "gap";
}) {
  return (
    <Card>
      <CardBody className="py-3">
        <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
          {label}
        </p>
        <p
          className={`mt-1 font-display text-xl font-semibold tabular-nums ${
            tone === "gap"
              ? "text-gap"
              : tone === "accent"
                ? "text-accent"
                : "text-fg"
          }`}
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}
