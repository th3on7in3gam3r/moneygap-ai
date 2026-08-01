import { currentUser } from "@clerk/nextjs/server";
import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { listUnlockedAchievements, evaluateAchievements } from "@/lib/growth-os/achievements";
import { listWeekCalendar } from "@/lib/growth-os/calendar";
import { listActiveNudges, refreshCoachNudges } from "@/lib/growth-os/coach";
import { listActiveGoals } from "@/lib/growth-os/goals";
import { getSuccessMetrics } from "@/lib/growth-os/metrics";
import { getInvestmentPortfolio } from "@/lib/growth-os/portfolio";
import { getTodayPriorities } from "@/lib/growth-os/priority";
import { listTimelineEvents } from "@/lib/growth-os/timeline";
import { findProjectsForWorkspace } from "@/lib/growth-os/dependencies";

function greetingForHour(hour: number, name: string) {
  const part =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}.`;
}

export async function getTodayDashboard(workspaceId: string) {
  const user = await currentUser().catch(() => null);
  const firstName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "there";
  const hour = new Date().getHours();

  const journey = await getGrowthJourney(workspaceId);
  const portfolio = await getInvestmentPortfolio(workspaceId);
  const priorities = await getTodayPriorities(workspaceId, 3);
  const goals = await listActiveGoals(workspaceId);
  const projects = await findProjectsForWorkspace(workspaceId);
  const projectsWaiting = projects.filter(
    (p) => p.status === "active" || p.status === "paused",
  ).length;

  let scoreDelta: number | null = null;
  if (journey.scoreHistory.length >= 2) {
    const hist = journey.scoreHistory;
    scoreDelta = hist[hist.length - 1]!.score - hist[hist.length - 2]!.score;
  }

  let competitorLine: string | null = null;
  if (journey.latestBrief?.body) {
    const body = journey.latestBrief.body;
    if (/competitor/i.test(body)) {
      competitorLine =
        body.split(/[.!?]/).find((s) => /competitor/i.test(s))?.trim() ??
        "Competitor activity noted in your latest Growth Brief.";
    }
  }

  const highPriority = priorities.filter(
    (p) => p.severity === "critical" || p.severity === "high" || p.opportunityIndex >= 70,
  ).length;

  try {
    await refreshCoachNudges(workspaceId);
  } catch {
    // soft-fail
  }
  try {
    await evaluateAchievements(workspaceId);
  } catch {
    // soft-fail
  }

  const [nudges, achievements, timeline, calendar, metrics] = await Promise.all([
    listActiveNudges(workspaceId),
    listUnlockedAchievements(workspaceId),
    listTimelineEvents(workspaceId, 12),
    listWeekCalendar(workspaceId),
    getSuccessMetrics(workspaceId),
  ]);

  const recommendation = priorities[0]
    ? {
        title: priorities[0].title,
        reason: priorities[0].reason,
        href: `/reports/${priorities[0].reportId}?focus=${priorities[0].id}`,
        websiteName: priorities[0].websiteName,
        websiteDomain: priorities[0].websiteDomain,
      }
    : journey.nextBestAction
      ? {
          title: journey.nextBestAction.title,
          reason: "Highest Opportunity Index™",
          href: `/reports/${journey.nextBestAction.reportId}?focus=${journey.nextBestAction.id}`,
          websiteName: journey.nextBestAction.websiteName ?? null,
          websiteDomain: journey.nextBestAction.websiteDomain ?? null,
        }
      : null;

  return {
    greeting: greetingForHour(hour, firstName),
    focus: {
      highPriorityCount: highPriority || priorities.length,
      projectsWaiting,
      scoreDelta,
      competitorLine,
      recommendation,
    },
    portfolio,
    priorities,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      status: g.status,
    })),
    journey,
    metrics,
    nudges,
    achievements,
    timeline,
    calendar,
  };
}
