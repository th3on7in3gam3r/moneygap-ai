import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AgencyAdvisorCard } from "@/components/dashboard/agency-advisor-card";
import { AgencyOverviewPanel } from "@/components/dashboard/agency-overview";
import {
  AnalyticsChart,
  ScoreTrendChart,
} from "@/components/dashboard/analytics-chart";
import { GrowthJourneyPanel } from "@/components/dashboard/growth-journey";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AchievementsPanel,
  CoachNudgesPanel,
  PortfolioPanel,
  SuccessMetricsPanel,
  TimelinePanel,
  TodayFocusPanel,
  Top3TodayPanel,
  WeekCalendarPanel,
} from "@/components/growth-os/panels";
import {
  MoneyGapMeter,
  MoneyGapScore,
  RevenueAtRisk,
  SeverityBadge,
} from "@/components/money-gap";
import { OnboardingReminders } from "@/components/onboarding/onboarding-reminders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAgencyOverview } from "@/lib/agency/overview";
import { isClientRole } from "@/lib/agency/permissions";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getWebsiteAnalytics } from "@/lib/analytics/workspace";
import {
  listUserIntelligenceReports,
  listUserWebsites,
} from "@/lib/analysis/reports";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getTodayDashboard } from "@/lib/growth-os/today";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const { userId, isAuthenticated } = await auth();
  let journey = null as Awaited<ReturnType<typeof getGrowthJourney>> | null;
  let agencyOverview = null;
  let isAgency = false;
  let workspaceType: "individual" | "agency" | "enterprise" = "individual";
  let planLabel = "free";
  let workspaceName = "Your workspace";
  let today = null as Awaited<ReturnType<typeof getTodayDashboard>> | null;
  let sites: Awaited<ReturnType<typeof listUserWebsites>> = [];
  let reports: Awaited<ReturnType<typeof listUserIntelligenceReports>> = [];

  if (isAuthenticated && userId) {
    try {
      const ctx = await loadAgencyContext();
      if (isClientRole(ctx.role)) {
        redirect("/dashboard/my-growth");
      }
      isAgency = ctx.isAgency;
      workspaceType =
        ctx.workspace.type === "enterprise"
          ? "enterprise"
          : ctx.workspace.type === "agency"
            ? "agency"
            : "individual";
      planLabel = (ctx.workspace.plan || "free").replace(/_/g, " ");
      workspaceName = ctx.workspace.agencyName || ctx.workspace.name;
      journey = await getGrowthJourney(ctx.workspace.id);
      today = await getTodayDashboard(ctx.workspace.id);
      if (isAgency) {
        agencyOverview = await getAgencyOverview(ctx.workspace.id);
      }
    } catch {
      try {
        const { workspace } = await ensureUserAndWorkspace();
        workspaceName = workspace.name;
        planLabel = (workspace.plan || "free").replace(/_/g, " ");
        workspaceType =
          workspace.type === "enterprise"
            ? "enterprise"
            : workspace.type === "agency"
              ? "agency"
              : "individual";
        journey = await getGrowthJourney(workspace.id);
        today = await getTodayDashboard(workspace.id);
      } catch {
        journey = null;
        today = null;
      }
    }
    sites = await listUserWebsites(userId);
    reports = await listUserIntelligenceReports(userId);
  }

  const livePriorities = today?.priorities ?? [];
  const topSite = [...sites].sort(
    (a, b) =>
      (b.latestReport?.revenueAtRisk ?? 0) - (a.latestReport?.revenueAtRisk ?? 0),
  )[0];
  const topAnalytics = topSite
    ? await getWebsiteAnalytics(topSite.website.id)
    : null;
  const dailySeries = topAnalytics?.dailySeries ?? [];
  const scoreSeries = topAnalytics?.scoreSeries ?? [];

  const headerTitle =
    workspaceType === "enterprise"
      ? "Enterprise Overview"
      : workspaceType === "agency"
        ? "Agency Overview"
        : "Overview";
  const headerSubtitle =
    workspaceType === "enterprise"
      ? "Portfolio command center — priorities, journey, and organization controls."
      : workspaceType === "agency"
        ? "Portfolio growth for your clients — Today, Journey, and delivery."
        : "Know exactly what to work on next across your sites.";
  const typeBadge =
    workspaceType === "enterprise"
      ? "Enterprise"
      : workspaceType === "agency"
        ? "Agency"
        : "Growth OS™";

  const toolLinks = [
    { href: "/dashboard/copilot", label: "Concierge" },
    { href: "/dashboard/goals", label: "Goals" },
    { href: "/dashboard/predictive", label: "Predictive" },
    { href: "/dashboard/self-optimization", label: "Self Optimization" },
    { href: "/dashboard/marketplace", label: "Marketplace" },
    { href: "/dashboard/launch", label: "Launch" },
    { href: "/dashboard/success", label: "Success" },
    ...(isAgency ? [{ href: "/dashboard/team", label: "Team" }] : []),
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <OnboardingReminders />
      <header className="space-y-5 border-b border-border pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
                {workspaceName}
              </p>
              <Badge tone="accent">{typeBadge}</Badge>
              <span className="text-xs capitalize text-fg-subtle">{planLabel}</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
              {headerTitle}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {headerSubtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button href="/dashboard/copilot" size="sm" variant="secondary">
              Ask Concierge
            </Button>
            <Button href="/dashboard/analyze" size="sm">
              Analyze New Website
            </Button>
          </div>
        </div>
        <nav
          aria-label="Workspace tools"
          className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-fg-muted"
        >
          {toolLinks.map((link, i) => (
            <span key={link.href} className="inline-flex items-center">
              {i > 0 ? (
                <span className="mx-2 text-border" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link href={link.href} className="transition hover:text-fg">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </header>

      {today ? <TodayFocusPanel data={today} /> : null}
      {today ? <Top3TodayPanel priorities={today.priorities} /> : null}
      {today ? <PortfolioPanel portfolio={today.portfolio} /> : null}
      {today ? <SuccessMetricsPanel metrics={today.metrics} /> : null}

      {agencyOverview ? <AgencyOverviewPanel overview={agencyOverview} /> : null}
      {isAgency ? <AgencyAdvisorCard /> : null}
      {journey ? <GrowthJourneyPanel journey={journey} /> : null}

      {today ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CoachNudgesPanel nudges={today.nudges} />
          <AchievementsPanel achievements={today.achievements} />
        </div>
      ) : null}
      {today ? <WeekCalendarPanel calendar={today.calendar} /> : null}
      {today ? <TimelinePanel timeline={today.timeline} /> : null}

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Workspace totals
            </h2>
            <p className="text-sm text-fg-muted">
              {sites.length > 0
                ? `Combined across ${sites.length} website${sites.length === 1 ? "" : "s"}`
                : "Combined metrics once you analyze a website"}
            </p>
          </div>
          {sites.length > 0 ? (
            <Link
              href="/dashboard/websites"
              className="text-sm text-accent hover:underline"
            >
              By website →
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue at risk"
            value={journey?.remainingOpportunity ?? 0}
            format="currency"
            tone="gap"
          />
          <StatCard
            label="Capture potential"
            value={journey?.capturedOpportunity ?? 0}
            format="currency"
            tone="accent"
          />
          <StatCard
            label="Avg gap score"
            value={journey?.avgMoneyGapScore ?? 0}
            format="score"
          />
          <StatCard label="Open gaps" value={journey?.openGaps ?? 0} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
                Focused property
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">
                {dailySeries.length > 0
                  ? "Revenue trend"
                  : "Revenue at risk trend"}
              </h2>
              <p className="text-sm text-fg-muted">
                {topSite
                  ? `${topSite.website.name} · ${topSite.website.domain}`
                  : "Analyze a website to unlock charts"}
              </p>
            </div>
            {topSite ? (
              <Link
                href={`/dashboard/analytics?website=${topSite.website.id}`}
                className="text-sm text-accent hover:underline"
              >
                Open analytics
              </Link>
            ) : null}
          </CardHeader>
          <CardBody>
            {dailySeries.length > 0 ? (
              <AnalyticsChart data={dailySeries} />
            ) : scoreSeries.length > 0 ? (
              <ScoreTrendChart data={scoreSeries} metric="revenueAtRisk" />
            ) : (
              <EmptyHint
                title="No chart data yet"
                body="Run an analysis to plot revenue at risk for this property."
                href="/dashboard/analyze"
                cta="Analyze a website"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col justify-between gap-6">
            {topSite?.latestReport ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
                      Highest revenue at risk
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold">
                      {topSite.website.name}
                    </h2>
                    <a
                      href={topSite.website.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm text-fg-muted hover:text-accent"
                    >
                      {topSite.website.domain}
                    </a>
                  </div>
                  <MoneyGapScore
                    score={topSite.latestReport.moneyGapScore}
                    size="sm"
                  />
                </div>
                <RevenueAtRisk amount={topSite.latestReport.revenueAtRisk} />
                <MoneyGapMeter score={topSite.latestReport.moneyGapScore} />
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/reports/${topSite.latestReport.id}`}
                    className="inline-flex text-sm font-medium text-accent hover:underline"
                  >
                    Open full report →
                  </Link>
                  <Link
                    href={`/dashboard/analytics?website=${topSite.website.id}`}
                    className="inline-flex text-sm font-medium text-fg-muted hover:text-accent hover:underline"
                  >
                    Analytics →
                  </Link>
                </div>
              </>
            ) : (
              <EmptyHint
                title="No properties yet"
                body="Analyze a website to see scores and revenue at risk here."
                href="/dashboard/analyze"
                cta="Analyze a website"
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold">Priority gaps</h2>
              <p className="text-sm text-fg-muted">
                Each gap shows which website it belongs to
              </p>
            </div>
            <Link
              href="/dashboard/money-gaps"
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {livePriorities.length > 0 ? (
              livePriorities.map((gap) => (
                <Link
                  key={gap.id}
                  href={`/reports/${gap.reportId}?focus=${gap.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3 transition hover:border-border-strong"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {(gap.websiteDomain || gap.websiteName) && (
                        <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                          {gap.websiteDomain ?? gap.websiteName}
                        </span>
                      )}
                      <SeverityBadge
                        severity={
                          (["critical", "high", "medium", "low"].includes(
                            gap.severity,
                          )
                            ? gap.severity
                            : "medium") as
                            | "critical"
                            | "high"
                            | "medium"
                            | "low"
                        }
                      />
                      <span className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                        {gap.category}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-fg">
                      {gap.title}
                    </p>
                  </div>
                  {gap.estimatedAnnualRevenue != null && (
                    <p className="shrink-0 font-display text-sm font-semibold tabular-nums text-gap">
                      {formatCurrency(gap.estimatedAnnualRevenue)}
                    </p>
                  )}
                </Link>
              ))
            ) : (
              <EmptyHint
                title="No open gaps"
                body="After you analyze a site, prioritized opportunities appear here."
                href="/dashboard/analyze"
                cta="Analyze a website"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold">Recent reports</h2>
              <p className="text-sm text-fg-muted">Labeled by website domain</p>
            </div>
            <Link
              href="/dashboard/reports"
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {reports.length > 0 ? (
              reports.slice(0, 5).map((item) => {
                const report = item.report!;
                return (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 transition hover:border-border-strong"
                  >
                    <div>
                      <p className="text-xs font-medium text-accent">
                        {item.website?.domain ?? "Website"}
                      </p>
                      <p className="text-sm font-medium text-fg">{report.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-semibold tabular-nums text-gap">
                        {formatCurrency(report.revenueAtRisk)}
                      </p>
                      <p className="text-[11px] capitalize text-fg-subtle">
                        {report.status}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyHint
                title="No reports yet"
                body="Completed analyses create intelligence reports you can share and act on."
                href="/dashboard/analyze"
                cta="Analyze a website"
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-lg font-semibold">
              Your websites
            </h2>
            <p className="text-sm text-fg-muted">
              Per-property scores — open a row for that site&apos;s analytics
            </p>
          </div>
          <Link
            href="/dashboard/websites"
            className="text-sm text-accent hover:underline"
          >
            Manage
          </Link>
        </CardHeader>
        <CardBody>
          {sites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-fg-subtle">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Gap score</th>
                    <th className="pb-3 font-medium">At risk</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map(({ website, latestReport }) => (
                    <tr
                      key={website.id}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="py-3">
                        <Link
                          href={`/dashboard/analytics?website=${website.id}`}
                          className="group block"
                        >
                          <p className="font-medium text-fg group-hover:text-accent">
                            {website.name}
                          </p>
                          <p className="text-xs text-fg-muted">{website.domain}</p>
                        </Link>
                      </td>
                      <td className="py-3">
                        <MoneyGapMeter
                          score={latestReport?.moneyGapScore ?? 0}
                          className="max-w-[140px]"
                        />
                      </td>
                      <td className="py-3 font-medium tabular-nums text-gap">
                        {formatCurrency(latestReport?.revenueAtRisk ?? 0)}
                      </td>
                      <td className="py-3">
                        <Badge
                          tone={
                            website.status === "active" ? "accent" : "gap"
                          }
                        >
                          {website.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyHint
              title="No websites tracked"
              body="Add a property to start scoring Money Gaps and monitoring growth."
              href="/dashboard/analyze"
              cta="Analyze a website"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyHint({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <EmptyState title={title} description={body} actionLabel={cta} actionHref={href} />
  );
}
