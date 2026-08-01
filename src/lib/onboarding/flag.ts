export function isIntelligentOnboardingEnabled(): boolean {
  const v = process.env.FEATURE_INTELLIGENT_ONBOARDING;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
