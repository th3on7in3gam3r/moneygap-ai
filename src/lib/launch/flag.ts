export function isPlatform10Enabled(): boolean {
  const v = process.env.FEATURE_PLATFORM_1_0;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
