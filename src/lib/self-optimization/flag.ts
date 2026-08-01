export function isSelfOptimizationEnabled(): boolean {
  const v = process.env.FEATURE_SELF_OPTIMIZATION;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
