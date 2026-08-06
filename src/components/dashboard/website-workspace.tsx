"use client";

import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileText,
  ListTree,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "@/components/money-gap/opportunity-card";
import { MoneyGapMeter } from "@/components/money-gap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

type TabId = "overview" | "history" | "gaps" | "recipes" | "reports";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Scan history" },
  { id: "gaps", label: "Money Gaps" },
  { id: "recipes", label: "Growth Recipes" },
  { id: "reports", label: "Reports" },
];

export type WebsiteWorkspaceView = {
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
  openGapsCount: number;
  completedImprovementsCount: number;
  scanHistory: {
    id: string;
    status: string;
    scanProfile: string | null;
    createdAt: string;
    completedAt: string | null;
    reportId: string | null;
    moneyGapScore: number | null;
    revenueAtRisk: number | null;
  }[];
  reports: {
    id: string;
    title: string;
    moneyGapScore: number;
    revenueAtRisk: number;
    createdAt: string;
  }[];
  opportunities: OpportunityCardData[];
};

export function WebsiteWorkspace({ data }: { data: WebsiteWorkspaceView }) {
  const [tab, setTab] = useState<TabId>("overview");
  const { website, latestReport } = data;
  const reportHref = latestReport ? `/reports/${latestReport.id}` : null;
  const growthPlanHref = latestReport
    ? `/reports/${latestReport.id}#roadmap`
    : `/dashboard/copilot?website=${website.id}`;
  const rescanHref = `/dashboard/analyze?url=${encodeURIComponent(website.url)}`;
  const analyticsHref = `/dashboard/analytics?website=${website.id}`;
  const copilotHref = `/dashboard/copilot?website=${website.id}`;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Website workspace
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {website.name}
          </h1>
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
        <div className="flex flex-wrap gap-2">
          {reportHref ? (
            <Button href={reportHref} size="sm">
              <FileText className="h-3.5 w-3.5" />
              View Report
            </Button>
          ) : null}
          <Button href={rescanHref} size="sm" variant="secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            Run New Scan
          </Button>
          <Button href="/dashboard/websites" size="sm" variant="ghost">
            All websites
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-border pb-px"
        role="tablist"
        aria-label="Website workspace sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-lg px-3.5 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-bg-elevated text-fg shadow-[inset_0_-2px_0_0_var(--color-accent)]"
                : "text-fg-muted hover:bg-bg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardBody className="space-y-4">
              <MoneyGapMeter score={latestReport?.moneyGapScore ?? 0} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat
                  label="Money Gaps found"
                  value={String(data.openGapsCount)}
                />
                <Stat
                  label="Completed"
                  value={String(data.completedImprovementsCount)}
                  icon
                />
                <Stat
                  label="Revenue at risk"
                  value={formatCurrency(latestReport?.revenueAtRisk ?? 0)}
                  gap
                />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {reportHref ? (
                  <Button href={reportHref} size="sm">
                    <FileText className="h-3.5 w-3.5" />
                    View Report
                  </Button>
                ) : (
                  <Button href={rescanHref} size="sm">
                    Analyze
                  </Button>
                )}
                <Button href={growthPlanHref} size="sm" variant="secondary">
                  <ListTree className="h-3.5 w-3.5" />
                  Growth Plan
                </Button>
                <Button href={rescanHref} size="sm" variant="ghost">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run New Scan
                </Button>
                <Button href={analyticsHref} size="sm" variant="ghost">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Growth History
                </Button>
                <Button href={copilotHref} size="sm" variant="ghost">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ask AI Growth Agent
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Status</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-fg-muted">
              <p>
                Property status:{" "}
                <Badge tone={website.status === "active" ? "accent" : "gap"}>
                  {website.status}
                </Badge>
              </p>
              <p>
                Latest report:{" "}
                {latestReport ? (
                  <a
                    href={`/reports/${latestReport.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Open intelligence report
                  </a>
                ) : (
                  "Not scanned yet"
                )}
              </p>
              <p>
                {data.opportunities.length} opportunities on the latest scan ·{" "}
                {data.scanHistory.length} scans recorded · {data.reports.length}{" "}
                reports.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Scan history</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Prior analyses for this property.
            </p>
          </CardHeader>
          <CardBody>
            {data.scanHistory.length === 0 ? (
              <p className="text-sm text-fg-muted">No scans yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.scanHistory.map((scan) => (
                  <li
                    key={scan.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-fg">
                        {formatDate(scan.completedAt ?? scan.createdAt)}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {scan.scanProfile ?? "standard"} · {scan.status}
                        {scan.moneyGapScore != null
                          ? ` · Score ${scan.moneyGapScore}`
                          : ""}
                      </p>
                    </div>
                    {scan.reportId ? (
                      <Button
                        href={`/reports/${scan.reportId}`}
                        size="sm"
                        variant="secondary"
                      >
                        Open report
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "gaps" && (
        <div className="space-y-4">
          {data.opportunities.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-fg-muted">
                  No Money Gaps on the latest report. Run a new scan to
                  discover opportunities.
                </p>
              </CardBody>
            </Card>
          ) : (
            data.opportunities.map((o, i) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                defaultOpen={i === 0}
                reportId={latestReport?.id}
              />
            ))
          )}
        </div>
      )}

      {tab === "recipes" && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Growth Recipe™ for each opportunity — problem, opportunity, and
            recommended fix path. Expand a card and use View Growth Recipe.
          </p>
          {data.opportunities.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-fg-muted">
                  Recipes appear after a scan finds Money Gaps.
                </p>
              </CardBody>
            </Card>
          ) : (
            data.opportunities.map((o, i) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                defaultOpen={i === 0}
                reportId={latestReport?.id}
              />
            ))
          )}
        </div>
      )}

      {tab === "reports" && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Reports</h2>
          </CardHeader>
          <CardBody>
            {data.reports.length === 0 ? (
              <p className="text-sm text-fg-muted">No intelligence reports yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.reports.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {formatDate(r.createdAt)} · Score {r.moneyGapScore} ·{" "}
                        {formatCurrency(r.revenueAtRisk)} at risk
                      </p>
                    </div>
                    <Button href={`/reports/${r.id}`} size="sm" variant="secondary">
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  gap,
}: {
  label: string;
  value: string;
  icon?: boolean;
  gap?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 font-display text-xl font-semibold tabular-nums",
          gap ? "text-gap" : "text-fg",
        )}
      >
        {icon ? (
          <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
        ) : null}
        {value}
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
