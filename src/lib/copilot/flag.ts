export function isGrowthCopilotEnabled(): boolean {
  const v = process.env.FEATURE_GROWTH_COPILOT;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
