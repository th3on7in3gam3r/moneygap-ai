import { getGrowthJourney } from "@/lib/monitor/growth-journey";
import { getInvestmentPortfolio } from "@/lib/growth-os/portfolio";
import { findProjectsForWorkspace } from "@/lib/growth-os/dependencies";

export type SuccessMetrics = {
  projectsCompleted: number;
  scoreGrowth: number | null;
  opportunityCaptured: number;
  businessImprovements: number;
  timeSavedHours: number;
};

export async function getSuccessMetrics(workspaceId: string): Promise<SuccessMetrics> {
  const journey = await getGrowthJourney(workspaceId);
  const portfolio = await getInvestmentPortfolio(workspaceId);
  const projects = await findProjectsForWorkspace(workspaceId);
  const projectsCompleted = projects.filter((p) => p.status === "completed").length;

  let scoreGrowth: number | null = null;
  if (journey.scoreHistory.length >= 2) {
    const first = journey.scoreHistory[0]!.score;
    const last = journey.scoreHistory[journey.scoreHistory.length - 1]!.score;
    scoreGrowth = last - first;
  }

  // Rough heuristic: ~3h saved per completed project / closed gap
  const timeSavedHours = Math.round(
    (projectsCompleted + journey.gapsClosed) * 3,
  );

  return {
    projectsCompleted,
    scoreGrowth,
    opportunityCaptured: portfolio.completed,
    businessImprovements: journey.gapsClosed,
    timeSavedHours,
  };
}
