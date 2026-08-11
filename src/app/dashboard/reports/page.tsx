import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listUserIntelligenceReports } from "@/lib/analysis/reports";
import { cn, formatCurrency } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string }>;
}) {
  const { userId } = await auth();
  const { history } = await searchParams;
  const showHistory = history === "1" || history === "true";
  const intelligence = userId
    ? await listUserIntelligenceReports(userId, { includeArchived: showHistory })
    : [];

  const liveCount = intelligence.filter((i) => i.report?.status === "ready").length;
  const archivedCount = intelligence.filter(
    (i) => i.report?.status === "archived",
  ).length;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Current growth report per website. Re-scanning a site replaces the
            live report; older scans stay in history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showHistory ? (
            <Button href="/dashboard/reports" size="sm" variant="secondary">
              Hide history
            </Button>
          ) : (
            <Button href="/dashboard/reports?history=1" size="sm" variant="secondary">
              Show history
            </Button>
          )}
          <Button href="/dashboard/analyze" size="sm">
            Analyze New Website
          </Button>
        </div>
      </div>

      {showHistory && (
        <p className="text-xs text-fg-subtle">
          Showing {liveCount} live · {archivedCount} archived
        </p>
      )}

      {intelligence.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {intelligence.map((item) => {
              const report = item.report!;
              const archived = report.status === "archived";
              const completedAt =
                item.completedAt ?? item.createdAt ?? report.createdAt;
              return (
                <li key={report.id}>
                  <Link
                    href={`/reports/${report.id}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 transition hover:bg-bg-muted/40 sm:gap-3 sm:px-4",
                      archived && "opacity-75",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                        report.moneyGapScore >= 70
                          ? "border-accent/40 text-accent"
                          : report.moneyGapScore >= 50
                            ? "border-gap/40 text-gap"
                            : "border-danger/40 text-danger",
                      )}
                      title="MoneyGap Score"
                    >
                      {report.moneyGapScore}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-fg">
                          {item.website.domain}
                        </span>
                        {archived ? (
                          <Badge tone="neutral" className="text-[10px]">
                            Archived
                          </Badge>
                        ) : (
                          <Badge tone="gap" className="text-[10px]">
                            Live
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-fg-muted">
                        {report.title}
                        {completedAt
                          ? ` · ${new Date(completedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                        Est. annual
                      </p>
                      <p className="font-display text-sm font-semibold tabular-nums text-gap">
                        {formatCurrency(report.revenueAtRisk)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <Card>
          <CardBody className="py-4">
            <EmptyState
              title={showHistory ? "No report history yet" : "No live reports yet"}
              description={
                showHistory
                  ? "Completed scans will appear here, including superseded ones."
                  : "Run a scan to create the current growth report for a website. Re-scans replace the live report."
              }
              actionLabel="Run your first scan"
              actionHref="/dashboard/analyze"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
