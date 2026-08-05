import type { FeatureKey } from "@/lib/billing/catalog";

export function upgradeMessage(feature: FeatureKey): string {
  switch (feature) {
    case "action_center":
    case "ai_advisor":
      return "You found an opportunity. Upgrade to unlock full implementation guidance.";
    case "competitor_intelligence":
      return "Competitive gaps are ready. Upgrade to unlock Competitive Intelligence™ depth.";
    case "monitor":
      return "Keep growth on autopilot. Upgrade to enable MoneyGap Monitor™ schedules.";
    case "white_label_reports":
      return "Present reports under your brand. Upgrade for white-label reporting.";
    case "agency_workspace":
      return "Manage multiple clients in one workspace. Upgrade to Agency.";
    case "scheduled_reports":
      return "Automate client growth reports. Upgrade for scheduled reporting.";
    case "team_members":
      return "Invite your team. Upgrade to unlock additional seats.";
    case "api_access":
      return "API access is included on all plans. If you still see this, refresh or contact support.";
    case "moneygap_engine":
    default:
      return "You're discovering real growth opportunities. Upgrade to analyze more and go deeper.";
  }
}

export function usageLimitMessage(kind: string): string {
  return `You've reached this month's ${kind.replace(/_/g, " ")} limit. Upgrade to keep growing without interruption.`;
}
