import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OpportunityCard } from "@/components/money-gap/opportunity-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { listUserOpenOpportunities } from "@/lib/analysis/reports";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getOpportunityPortfolio } from "@/lib/monitor/growth-journey";
import type { OpportunityFix } from "@/db/schema";
import { formatCurrency } from "@/lib/utils";

export default async function MoneyGapsPage() {
  const { userId } = await auth();
  const realOpportunities = userId ? await listUserOpenOpportunities(userId) : [];

  let portfolio = null;
  if (userId) {
    try {
      const { workspace } = await ensureUserAndWorkspace();
      portfolio = await getOpportunityPortfolio(workspace.id);
    } catch {
      portfolio = null;
    }
  }

  const totalImpact = realOpportunities.reduce(
    (s, o) => s + (o.estimatedAnnualRevenue ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Money Gaps
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Missing opportunities ranked by business impact — with AI estimates
            and action plans.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {realOpportunities.length > 0 ? (
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Estimated annual opportunity
              </p>
              <p className="font-display text-2xl font-semibold tabular-nums text-gap">
                {formatCurrency(totalImpact)}
              </p>
            </div>
          ) : null}
          <Button href="/dashboard/analyze" size="sm">
            Analyze New Website
          </Button>
        </div>
      </div>

      {portfolio && portfolio.total > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PortfolioStat label="Open" value={String(portfolio.open)} />
          <PortfolioStat label="Completed" value={String(portfolio.completed)} />
          <PortfolioStat label="Total" value={String(portfolio.total)} />
          <PortfolioStat
            label="Captured"
            value={formatCurrency(portfolio.captured, { compact: true })}
            tone="accent"
          />
          <PortfolioStat
            label="Remaining"
            value={formatCurrency(portfolio.remaining, { compact: true })}
            tone="gap"
          />
        </div>
      ) : null}

      {realOpportunities.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone="gap">Opportunity-first</Badge>
            <Badge tone="neutral">{realOpportunities.length} open gaps</Badge>
            <Badge tone="accent">AI Estimate</Badge>
          </div>
          <div className="space-y-4">
            {realOpportunities.map((o, index) => (
              <div key={o.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
                  <span>{o.report?.website?.domain ?? "Website"}</span>
                  {o.reportId && (
                    <Link
                      href={`/reports/${o.reportId}`}
                      className="text-accent hover:underline"
                    >
                      Open report →
                    </Link>
                  )}
                </div>
                <OpportunityCard
                  defaultOpen={index === 0}
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
                    fixes: (o.fixes ?? []) as OpportunityFix[],
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
                    confidenceIntel: o.confidenceIntel ?? null,
                  }}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="font-display text-lg font-semibold">No open gaps</p>
            <p className="mt-2 text-sm text-fg-muted">
              Analyze a website to surface real Money Gaps. We do not show
              sample findings in your workspace.
            </p>
            <div className="mt-5">
              <Button href="/dashboard/analyze" size="sm">
                Analyze New Website
              </Button>
            </div>
          </CardBody>
        </Card>
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
