import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type TodayPayload = Awaited<
  ReturnType<typeof import("@/lib/growth-os/today").getTodayDashboard>
>;

export function TodayFocusPanel({ data }: { data: TodayPayload }) {
  const { greeting, focus } = data;
  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Growth OS™
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {greeting}
          </h2>
        </div>
        <Button href="/dashboard/goals" size="sm" variant="secondary">
          Goals
        </Button>
      </CardHeader>
      <CardBody className="space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            Today&apos;s Focus
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-fg">
            <li>
              <span className="tabular-nums font-semibold">
                {focus.highPriorityCount}
              </span>{" "}
              High Priority{" "}
              {focus.highPriorityCount === 1 ? "Opportunity" : "Opportunities"}
            </li>
            <li>
              <span className="tabular-nums font-semibold">
                {focus.projectsWaiting}
              </span>{" "}
              Project{focus.projectsWaiting === 1 ? "" : "s"} Waiting
            </li>
            {focus.scoreDelta != null && focus.scoreDelta !== 0 && (
              <li>
                MoneyGap Score™ {focus.scoreDelta > 0 ? "increased" : "changed"}{" "}
                recently ({focus.scoreDelta > 0 ? "+" : ""}
                {focus.scoreDelta}).
              </li>
            )}
            {focus.competitorLine && <li>{focus.competitorLine}</li>}
          </ul>
        </div>

        {focus.recommendation && (
          <div className="rounded-xl border border-border bg-bg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              AI Recommendation
            </p>
            {(focus.recommendation.websiteDomain ||
              focus.recommendation.websiteName) && (
              <p className="mt-1 text-xs font-medium text-accent">
                {focus.recommendation.websiteName
                  ? `${focus.recommendation.websiteName} · `
                  : ""}
                {focus.recommendation.websiteDomain}
              </p>
            )}
            <p className="mt-1 text-sm font-medium text-fg">
              {focus.recommendation.title}
            </p>
            <p className="mt-1 text-xs text-fg-muted">{focus.recommendation.reason}</p>
            <div className="mt-3">
              <Button href={focus.recommendation.href} size="sm">
                Work On This
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function PortfolioPanel({
  portfolio,
}: {
  portfolio: TodayPayload["portfolio"];
}) {
  const rows = [
    { label: "Estimated Annual Opportunity", value: portfolio.estimatedAnnual },
    { label: "Completed", value: portfolio.completed },
    { label: "In Progress", value: portfolio.inProgress },
    { label: "Remaining", value: portfolio.remaining },
  ];
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Opportunity Portfolio</h2>
          <p className="text-sm text-fg-muted">Totals across all websites</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label} className="rounded-xl border border-border px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                {r.label}
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gap">
                {formatCurrency(r.value)}
              </p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function Top3TodayPanel({
  priorities,
}: {
  priorities: TodayPayload["priorities"];
}) {
  if (priorities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Top 3 Today</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-fg-muted">
            Run a website analysis to unlock today&apos;s priorities.
          </p>
          <Button href="/dashboard/analyze" size="sm" className="mt-3">
            Analyze website
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Top 3 Today</h2>
          <p className="text-sm text-fg-muted">
            Highest-priority gaps, labeled by website
          </p>
        </div>
        <Badge tone="accent">Priority Engine</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        {priorities.map((p, i) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-fg-subtle">#{i + 1}</p>
                {(p.websiteDomain || p.websiteName) && (
                  <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                    {p.websiteDomain ?? p.websiteName}
                  </span>
                )}
              </div>
              <p className="font-medium text-fg">{p.title}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{p.reason}</p>
            </div>
            <Button
              href={`/reports/${p.reportId}?focus=${p.id}`}
              size="sm"
              variant="secondary"
            >
              Work On This
            </Button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function SuccessMetricsPanel({
  metrics,
}: {
  metrics: TodayPayload["metrics"];
}) {
  const rows = [
    { label: "Projects completed", value: String(metrics.projectsCompleted) },
    {
      label: "Score growth",
      value:
        metrics.scoreGrowth == null
          ? "—"
          : `${metrics.scoreGrowth > 0 ? "+" : ""}${metrics.scoreGrowth}`,
    },
    {
      label: "Opportunity captured",
      value: formatCurrency(metrics.opportunityCaptured),
    },
    {
      label: "Business improvements",
      value: String(metrics.businessImprovements),
    },
    {
      label: "Time saved (est.)",
      value: `${metrics.timeSavedHours}h`,
    },
  ];
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Success Metrics</h2>
          <p className="text-sm text-fg-muted">Workspace rollup across all properties</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((r) => (
            <div key={r.label}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                {r.label}
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-fg">
                {r.value}
              </p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function CoachNudgesPanel({ nudges }: { nudges: TodayPayload["nudges"] }) {
  if (nudges.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">AI Business Coach</h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {nudges.map((n) => (
          <div key={n.id} className="rounded-xl border border-border px-3 py-3">
            <Badge
              tone={
                n.severity === "warn"
                  ? "gap"
                  : n.severity === "celebrate"
                    ? "accent"
                    : "neutral"
              }
            >
              {n.severity}
            </Badge>
            <p className="mt-2 text-sm text-fg">{n.message}</p>
            {n.ctaHref && (
              <Link
                href={n.ctaHref}
                className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
              >
                {n.ctaLabel ?? "Open"}
              </Link>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function AchievementsPanel({
  achievements,
}: {
  achievements: TodayPayload["achievements"];
}) {
  if (achievements.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">Achievements</h2>
      </CardHeader>
      <CardBody className="flex flex-wrap gap-2">
        {achievements.map((a) => (
          <Badge key={a.slug} tone="accent">
            {a.title}
          </Badge>
        ))}
      </CardBody>
    </Card>
  );
}

export function TimelinePanel({ timeline }: { timeline: TodayPayload["timeline"] }) {
  if (timeline.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">Business Timeline</h2>
      </CardHeader>
      <CardBody>
        <ol className="space-y-3 border-l border-border pl-4">
          {timeline.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-accent" />
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                {new Date(e.occurredAt).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm font-medium text-fg">{e.title}</p>
              {e.body && <p className="text-xs text-fg-muted">{e.body}</p>}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function WeekCalendarPanel({
  calendar,
}: {
  calendar: TodayPayload["calendar"];
}) {
  if (calendar.length === 0) return null;
  const byDay = new Map<string, typeof calendar>();
  for (const item of calendar) {
    const list = byDay.get(item.day) ?? [];
    list.push(item);
    byDay.set(item.day, list);
  }
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">This Week</h2>
        <Badge tone="neutral">Growth Calendar</Badge>
      </CardHeader>
      <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[...byDay.entries()].map(([day, items]) => (
          <div key={day} className="rounded-xl border border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              {day}
            </p>
            <ul className="mt-1 space-y-1">
              {items.map((i) => (
                <li key={i.id} className="text-xs text-fg">
                  {i.reportId && i.opportunityId ? (
                    <Link
                      href={`/reports/${i.reportId}?focus=${i.opportunityId}`}
                      className="hover:text-accent"
                    >
                      {i.title}
                    </Link>
                  ) : (
                    i.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
