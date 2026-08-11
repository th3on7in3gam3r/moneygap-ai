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
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Growth intelligence from completed analyses.
          </p>
        </div>
        <Button href="/dashboard/analyze" size="sm">
          Analyze New Website
        </Button>
      </div>

      {intelligence.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {intelligence.map((item) => (
              <li key={item.report!.id}>
                <Link
                  href={`/reports/${item.report!.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-bg-muted/40 sm:gap-4 sm:px-4"
                >
                  <MoneyGapScore
                    score={item.report!.moneyGapScore}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-fg">
                        {item.website.domain}
                      </span>
                      <Badge tone="gap" className="text-[10px]">
                        opportunities
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {item.report!.title}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      Est. annual
                    </p>
                    <p className="font-display text-sm font-semibold tabular-nums text-gap">
                      {formatCurrency(item.report!.revenueAtRisk)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
