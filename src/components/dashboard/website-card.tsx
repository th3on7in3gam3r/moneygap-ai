import Link from "next/link";
import { ArrowUpRight, BarChart3, ExternalLink, FileText } from "lucide-react";
import { MonitorScheduleControl } from "@/components/dashboard/monitor-schedule";
import { MoneyGapMeter } from "@/components/money-gap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Schedule = {
  id: string;
  frequency: string;
  intervalDays: number | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
} | null;

type WebsiteCardProps = {
  website: {
    id: string;
    name: string;
    domain: string;
    url: string;
    status: string;
  };
  latestReport: {
    id: string;
    moneyGapScore: number;
    revenueAtRisk: number;
  } | null;
  schedule: Schedule;
};

export function WebsiteCard({
  website,
  latestReport,
  schedule,
}: WebsiteCardProps) {
  const analyticsHref = `/dashboard/analytics?website=${website.id}`;
  const reportHref = latestReport ? `/reports/${latestReport.id}` : null;
  const score = latestReport?.moneyGapScore ?? 0;
  const atRisk = latestReport?.revenueAtRisk ?? 0;

  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              href={analyticsHref}
              className="group inline-flex max-w-full items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h2 className="truncate font-display text-lg font-semibold text-fg transition group-hover:text-accent">
                {website.name}
              </h2>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-subtle opacity-0 transition group-hover:opacity-100 group-hover:text-accent" />
            </Link>
            <a
              href={website.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-fg-muted transition hover:text-accent"
            >
              <span className="truncate">{website.domain}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
            </a>
          </div>
          <Badge tone={website.status === "active" ? "accent" : "gap"}>
            {website.status}
          </Badge>
        </div>

        <Link
          href={analyticsHref}
          className="block rounded-xl border border-border bg-bg-muted/40 p-3 transition hover:border-border-strong hover:bg-bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoneyGapMeter score={score} />
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Revenue at risk
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gap">
                {formatCurrency(atRisk)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
              Analytics
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button href={analyticsHref} size="sm" className="flex-1 sm:flex-none">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
          {reportHref ? (
            <Button
              href={reportHref}
              size="sm"
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              <FileText className="h-3.5 w-3.5" />
              Report
            </Button>
          ) : (
            <Button
              href="/dashboard/analyze"
              size="sm"
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              Analyze
            </Button>
          )}
        </div>

        <MonitorScheduleControl
          websiteId={website.id}
          initialSchedule={schedule}
        />
      </CardBody>
    </Card>
  );
}
