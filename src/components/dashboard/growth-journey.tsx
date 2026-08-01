"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type GrowthJourneyData = {
  avgMoneyGapScore: number;
  gapsClosed: number;
  projectsCompleted: number;
  capturedOpportunity: number;
  remainingOpportunity: number;
  openGaps: number;
  totalGaps: number;
  nextBestAction: {
    id: string;
    title: string;
    reportId: string;
    opportunityIndex: number;
    estimatedAnnualRevenue: number | null;
    websiteName?: string | null;
    websiteDomain?: string | null;
  } | null;
  scoreHistory: { date: string; score: number }[];
  latestBrief: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
  } | null;
};

export function GrowthJourneyPanel({ journey }: { journey: GrowthJourneyData }) {
  const hasLive = journey.totalGaps > 0 || journey.scoreHistory.length > 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Growth Journey</h2>
          <p className="text-sm text-fg-muted">
            Portfolio totals across all tracked websites
          </p>
        </div>
        <Badge tone={hasLive ? "accent" : "neutral"}>
          {hasLive ? "Live" : "Awaiting analysis"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Avg MoneyGap Score™" value={String(journey.avgMoneyGapScore)} />
          <Metric label="Gaps closed" value={String(journey.gapsClosed)} />
          <Metric label="Projects completed" value={String(journey.projectsCompleted)} />
          <Metric
            label="Captured opportunity"
            value={formatCurrency(journey.capturedOpportunity, { compact: true })}
            tone="accent"
          />
          <Metric
            label="Remaining"
            value={formatCurrency(journey.remainingOpportunity, { compact: true })}
            tone="gap"
          />
        </div>

        {journey.scoreHistory.length > 1 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Score timeline
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={journey.scoreHistory}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--fg)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--accent)"
                    fill="url(#scoreFill)"
                    strokeWidth={2}
                    name="MoneyGap Score™"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {journey.nextBestAction ? (
          <div className="rounded-xl border border-border bg-bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Next best action
            </p>
            <p className="mt-1 text-sm font-medium text-fg">{journey.nextBestAction.title}</p>
            {(journey.nextBestAction.websiteDomain ||
              journey.nextBestAction.websiteName) && (
              <p className="mt-1 text-xs text-fg-muted">
                {journey.nextBestAction.websiteName
                  ? `${journey.nextBestAction.websiteName} · `
                  : ""}
                {journey.nextBestAction.websiteDomain}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              <span>Opportunity Index™ {journey.nextBestAction.opportunityIndex}</span>
              {journey.nextBestAction.estimatedAnnualRevenue != null && (
                <span className="text-gap">
                  {formatCurrency(journey.nextBestAction.estimatedAnnualRevenue)} est.
                </span>
              )}
              <Link
                href={`/reports/${journey.nextBestAction.reportId}`}
                className="font-medium text-accent hover:underline"
              >
                Open report →
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            Analyze a website to unlock your Growth Journey metrics.
          </p>
        )}

        {journey.latestBrief ? (
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Latest Growth Brief
            </p>
            <p className="mt-1 text-sm font-medium text-fg">{journey.latestBrief.title}</p>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-fg-muted">
              {journey.latestBrief.body}
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "gap";
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p
        className={`mt-1 font-display text-xl font-semibold tabular-nums ${
          tone === "gap" ? "text-gap" : tone === "accent" ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
