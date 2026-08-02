import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  AnalyticsChart,
  ScoreTrendChart,
} from "@/components/dashboard/analytics-chart";
import { AnalyticsAnalyzeActions } from "@/components/dashboard/analytics-analyze-actions";
import { MoneyGapMeter, MoneyGapScore } from "@/components/money-gap";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { resolveAnalyticsWebsite } from "@/lib/analytics/workspace";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;

  let journey = null as Awaited<ReturnType<typeof getGrowthJourney>> | null;
  let sites: Awaited<ReturnType<typeof resolveAnalyticsWebsite>>["sites"] = [];
  let selected: Awaited<
    ReturnType<typeof resolveAnalyticsWebsite>
  >["selected"] = null;

  if (userId) {
    try {
      const { workspace } = await ensureUserAndWorkspace();
      journey = await getGrowthJourney(workspace.id);
    } catch {
      journey = null;
    }
    const resolved = await resolveAnalyticsWebsite(userId, params.website);
    sites = resolved.sites;
    selected = resolved.selected;
  }

  const website = selected?.website ?? null;
  const scoreSeries = selected?.scoreSeries ?? [];
  const dailySeries = selected?.dailySeries ?? [];
  const hasScoreChart = scoreSeries.length > 0;
  const hasTrafficChart = dailySeries.length > 0;
  const latestScore =
    website?.latestScore ??
    (scoreSeries.length > 0 ? scoreSeries[scoreSeries.length - 1]!.score : null);
  const latestAtRisk =
    website?.latestRevenueAtRisk ??
    (scoreSeries.length > 0
      ? scoreSeries[scoreSeries.length - 1]!.revenueAtRisk
      : null);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Performance for properties you have analyzed — scores, opportunity,
            and traffic when metrics are connected.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/integrations" size="sm" variant="secondary">
            Connect analytics
          </Button>
          <AnalyticsAnalyzeActions
            websiteUrl={website?.url}
            websiteName={website?.name}
            websiteDomain={website?.domain}
          />
        </div>
      </div>

      {sites.length > 0 ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                  Property
                </p>
                {website ? (
                  <>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                      {website.name}
                    </h2>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm text-accent hover:underline"
                    >
                      {website.domain}
                    </a>
                    <p className="mt-1 truncate text-xs text-fg-subtle">
                      {website.url}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-fg-muted">Select a property</p>
                )}
              </div>
              {latestScore != null ? (
                <MoneyGapScore score={latestScore} size="sm" />
              ) : null}
            </div>

            {sites.length > 1 ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {sites.map((site) => {
                  const active = website?.id === site.id;
                  return (
                    <Link
                      key={site.id}
                      href={`/dashboard/analytics?website=${site.id}`}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
                      }`}
                    >
                      {site.name}
                      <span className="ml-1.5 text-fg-subtle">{site.domain}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Money Gap score"
          value={latestScore ?? journey?.avgMoneyGapScore ?? 0}
          format="score"
        />
        <StatCard label="Open gaps" value={journey?.openGaps ?? 0} />
        <StatCard
          label="Revenue at risk"
          value={
            latestAtRisk ?? journey?.remainingOpportunity ?? 0
          }
          format="currency"
          tone="gap"
        />
        <StatCard
          label="Captured opportunity"
          value={journey?.capturedOpportunity ?? 0}
          format="currency"
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold">
                {hasTrafficChart
                  ? "Daily revenue"
                  : "Revenue at risk over time"}
              </h2>
              <p className="text-sm text-fg-muted">
                {website
                  ? hasTrafficChart
                    ? `${website.domain} · connected metrics`
                    : `${website.domain} · from analysis snapshots`
                  : "Select or analyze a website"}
              </p>
            </div>
            {hasTrafficChart || hasScoreChart ? (
              <Badge tone="accent">Live</Badge>
            ) : (
              <Badge tone="neutral">No data yet</Badge>
            )}
          </CardHeader>
          <CardBody>
            {hasTrafficChart ? (
              <AnalyticsChart data={dailySeries} />
            ) : hasScoreChart ? (
              <ScoreTrendChart data={scoreSeries} metric="revenueAtRisk" />
            ) : (
              <EmptyAnalytics
                title="No chart data yet"
                body="Analyze this property to plot revenue at risk from Money Gap reports. Connect analytics for visitor and revenue series."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col justify-between gap-6">
            {website ? (
              <>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {website.name}
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">{website.domain}</p>
                </div>
                {latestScore != null ? (
                  <>
                    <MoneyGapMeter score={latestScore} />
                    {latestAtRisk != null ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                          Revenue at risk
                        </p>
                        <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-gap">
                          {formatCurrency(latestAtRisk)}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-fg-muted">
                    No score yet — run an analysis for this URL.
                  </p>
                )}
                {website.latestReportId ? (
                  <Link
                    href={`/reports/${website.latestReportId}`}
                    className="inline-flex text-sm font-medium text-accent hover:underline"
                  >
                    Open latest report →
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/analyze"
                    className="inline-flex text-sm font-medium text-accent hover:underline"
                  >
                    Analyze {website.domain} →
                  </Link>
                )}
              </>
            ) : (
              <EmptyAnalytics
                title="No websites yet"
                body="Analyze a public URL to unlock per-site analytics, scores, and charts."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">
              Money Gap score trend
            </h2>
            <p className="text-sm text-fg-muted">
              {website
                ? `${website.name} (${website.domain})`
                : "Score history from completed analyses"}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {hasScoreChart ? (
            <ScoreTrendChart data={scoreSeries} metric="score" />
          ) : (
            <EmptyAnalytics
              title="No score history"
              body="Each completed analysis stores a Money Gap score snapshot for this property."
            />
          )}
        </CardBody>
      </Card>

      {selected?.totals ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Visitors (series)
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {formatNumber(selected.totals.visitors)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Avg bounce rate
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {formatPercent(selected.totals.avgBounce)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Series revenue
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {formatCurrency(selected.totals.revenue)}
              </p>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Latest score
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {latestScore != null ? latestScore : "—"}
                {latestScore != null ? (
                  <span className="ml-1 text-base font-medium text-fg-subtle">
                    /100
                  </span>
                ) : null}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Gaps closed
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {formatNumber(journey?.gapsClosed ?? 0)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                Capture rate
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                {(() => {
                  const captured = journey?.capturedOpportunity ?? 0;
                  const remaining = journey?.remainingOpportunity ?? 0;
                  const total = captured + remaining;
                  return total > 0
                    ? formatPercent((captured / total) * 100)
                    : "—";
                })()}
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function EmptyAnalytics({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard/analyze"
          className="text-sm font-medium text-accent hover:underline"
        >
          Analyze a website →
        </Link>
        <Link
          href="/dashboard/integrations"
          className="text-sm font-medium text-accent hover:underline"
        >
          Connect analytics →
        </Link>
      </div>
    </div>
  );
}
