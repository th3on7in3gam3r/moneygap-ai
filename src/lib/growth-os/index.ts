export { GOAL_TYPES, GOAL_CATEGORY_HINTS, goalAlignmentScore } from "@/lib/growth-os/goal-types";
export {
  listGoals,
  listActiveGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  linkGoal,
  activeGoalTypes,
} from "@/lib/growth-os/goals";
export { getInvestmentPortfolio, type OpportunityPortfolio } from "@/lib/growth-os/portfolio";
export { getTodayPriorities, type TodayPriority } from "@/lib/growth-os/priority";
export {
  addDependency,
  removeDependency,
  listDependenciesForReport,
  isProjectUnblocked,
  getBlockedProjectIds,
  findProjectsForWorkspace,
} from "@/lib/growth-os/dependencies";
export { getTodayDashboard } from "@/lib/growth-os/today";
export {
  refreshCoachNudges,
  listActiveNudges,
  dismissNudge,
} from "@/lib/growth-os/coach";
export {
  ensureAchievementCatalog,
  evaluateAchievements,
  listUnlockedAchievements,
  ACHIEVEMENT_CATALOG,
} from "@/lib/growth-os/achievements";
export { recordTimelineEvent, listTimelineEvents } from "@/lib/growth-os/timeline";
export { ensureWeeklyCalendar, listWeekCalendar, currentWeekStartIso } from "@/lib/growth-os/calendar";
export { getSuccessMetrics, type SuccessMetrics } from "@/lib/growth-os/metrics";
