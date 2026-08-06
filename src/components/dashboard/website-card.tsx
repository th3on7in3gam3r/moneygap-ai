import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileText,
  ListTree,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
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
  openGapsCount?: number;
  completedImprovementsCount?: number;
  lastScanAt?: string | null;
  schedule: Schedule;
};

export function WebsiteCard({
  website,
  latestReport,
  openGapsCount = 0,
  completedImprovementsCount = 0,
  lastScanAt = null,
  schedule,
}: WebsiteCardProps) {
  const analyticsHref = `/dashboard/analytics?website=${website.id}`;
  const workspaceHref = `/dashboard/websites/${website.id}`;
  const copilotHref = `/dashboard/copilot?website=${website.id}`;
  const reportHref = latestReport ? `/reports/${latestReport.id}` : null;
  const growthPlanHref = latestReport
    ? `/reports/${latestReport.id}#roadmap`
    : copilotHref;
  const rescanHref = `/dashboard/analyze?url=${encodeURIComponent(website.url)}`;
  const score = latestReport?.moneyGapScore ?? 0;
  const atRisk = latestReport?.revenueAtRisk ?? 0;
  const lastScanLabel = lastScanAt
    ? formatScanDate(lastScanAt)
    : "Not scanned yet";

  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              href={workspaceHref}
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

        <div className="rounded-xl border border-border bg-bg-muted/40 p-3">
          <MoneyGapMeter score={score} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Money Gaps found
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-fg">
                {openGapsCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Completed
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-semibold tabular-nums text-fg">
                <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
                {completedImprovementsCount}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Last scan
              </p>
              <p className="mt-1 text-sm font-medium text-fg">{lastScanLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Revenue at risk
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-gap">
                {formatCurrency(atRisk)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button href={workspaceHref} size="sm" variant="secondary" className="flex-1 sm:flex-none">
            Open workspace
          </Button>
          {reportHref ? (
            <Button href={reportHref} size="sm" className="flex-1 sm:flex-none">
              <FileText className="h-3.5 w-3.5" />
              View Report
            </Button>
          ) : (
            <Button href={rescanHref} size="sm" className="flex-1 sm:flex-none">
              Analyze
            </Button>
          )}
          <Button
            href={growthPlanHref}
            size="sm"
            variant="secondary"
            className="flex-1 sm:flex-none"
          >
            <ListTree className="h-3.5 w-3.5" />
            Growth Plan
          </Button>
          <Button
            href={rescanHref}
            size="sm"
            variant="ghost"
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Run New Scan
          </Button>
          <Button
            href={analyticsHref}
            size="sm"
            variant="ghost"
            className="flex-1 sm:flex-none"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Growth History
          </Button>
          <Button
            href={copilotHref}
            size="sm"
            variant="ghost"
            className="flex-1 sm:flex-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask AI Growth Agent
          </Button>
        </div>

        <MonitorScheduleControl
          websiteId={website.id}
          initialSchedule={schedule}
        />
      </CardBody>
    </Card>
  );
}

function formatScanDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "Today";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
