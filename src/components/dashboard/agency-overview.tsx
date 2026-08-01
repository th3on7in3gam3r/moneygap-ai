import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type AgencyOverviewData = {
  totalClients: number;
  reportsGenerated: number;
  avgMoneyGapScore: number;
  completedRecommendations: number;
  estimatedOpportunitiesFound: number;
  websitesManaged: number;
  clientsNeedingAttention: {
    reportId: string;
    websiteId: string;
    moneyGapScore: number;
    title: string;
  }[];
};

export function AgencyOverviewPanel({
  overview,
}: {
  overview: AgencyOverviewData;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Agency Growth Overview</h2>
          <p className="text-sm text-fg-muted">
            Portfolio snapshot across clients you manage
          </p>
        </div>
        <Badge tone="accent">Agency</Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Clients managed" value={String(overview.totalClients)} />
          <Metric label="Reports generated" value={String(overview.reportsGenerated)} />
          <Metric label="Avg MoneyGap Score™" value={String(overview.avgMoneyGapScore)} />
          <Metric
            label="Completed recommendations"
            value={String(overview.completedRecommendations)}
          />
          <Metric
            label="Opportunities identified"
            value={formatCurrency(overview.estimatedOpportunitiesFound, {
              compact: true,
            })}
            tone="gap"
          />
        </div>
        {overview.clientsNeedingAttention.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Needs attention
            </p>
            <div className="space-y-2">
              {overview.clientsNeedingAttention.slice(0, 4).map((c) => (
                <Link
                  key={c.reportId}
                  href={`/reports/${c.reportId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm transition hover:border-border-strong"
                >
                  <span className="truncate text-fg">{c.title}</span>
                  <span className="shrink-0 tabular-nums text-gap">
                    Score {c.moneyGapScore}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
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
  tone?: "gap";
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p
        className={`mt-1 font-display text-xl font-semibold tabular-nums ${
          tone === "gap" ? "text-gap" : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
