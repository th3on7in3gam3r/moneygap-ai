export function isPredictiveIntelEnabled(): boolean {
  const v = process.env.FEATURE_PREDICTIVE_INTEL;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
