import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MoneyGapScore } from "@/components/money-gap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listUserIntelligenceReports } from "@/lib/analysis/reports";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const { userId } = await auth();
  const intelligence = userId ? await listUserIntelligenceReports(userId) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Growth intelligence reports from your completed analyses.
          </p>
        </div>
        <Button href="/dashboard/analyze" size="sm">
          Analyze New Website
        </Button>
      </div>

      {intelligence.length > 0 ? (
        <div className="grid gap-4">
          {intelligence.map((item) => (
            <Link key={item.report!.id} href={`/reports/${item.report!.id}`}>
              <Card interactive className="transition hover:bg-bg-muted/30">
                <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="gap">opportunities</Badge>
                      <Badge tone="accent">intelligence</Badge>
                      <span className="text-xs text-fg-subtle">
                        {item.website.domain}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      {item.report!.title}
                    </h3>
                    <p className="line-clamp-2 max-w-2xl text-sm text-fg-muted">
                      {item.report!.opportunitySummary ??
                        item.report!.overview ??
                        item.report!.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                        Est. annual opportunity
                      </p>
                      <p className="font-display text-xl font-semibold tabular-nums text-gap">
                        {formatCurrency(item.report!.revenueAtRisk)}
                      </p>
                    </div>
                    <MoneyGapScore
                      score={item.report!.moneyGapScore}
                      size="sm"
                    />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="py-4">
            <EmptyState
              title="No reports yet?"
              description="Run your first scan to generate a Growth Report with Money Gaps and Fix Paths™."
              actionLabel="Run your first scan"
              actionHref="/dashboard/analyze"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
