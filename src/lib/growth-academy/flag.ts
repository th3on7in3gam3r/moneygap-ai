export function isGrowthAcademyEnabled(): boolean {
  const v = process.env.FEATURE_GROWTH_ACADEMY;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
