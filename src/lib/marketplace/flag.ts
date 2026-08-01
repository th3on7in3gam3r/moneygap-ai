export function isMarketplaceEnabled(): boolean {
  const v = process.env.FEATURE_MARKETPLACE;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
