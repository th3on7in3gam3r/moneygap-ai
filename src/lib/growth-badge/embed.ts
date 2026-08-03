import { getSiteOrigin } from "@/lib/seo";
import { badgeStyleLabel } from "@/lib/growth-badge/styles";
import type { GrowthBadgeStyle } from "@/db/schema";

export function badgeVerifyUrl(publicId: string): string {
  return `${getSiteOrigin()}/verify/${encodeURIComponent(publicId)}`;
}

export function badgeSvgUrl(publicId: string): string {
  return `${getSiteOrigin()}/api/badge/${encodeURIComponent(publicId)}/svg`;
}

export function createEmbedCode(
  publicId: string,
  style: GrowthBadgeStyle,
): string {
  const href = badgeVerifyUrl(publicId);
  const src = badgeSvgUrl(publicId);
  const alt = badgeStyleLabel(style);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">\n  <img src="${src}" alt="${alt}" width="220" height="56" />\n</a>`;
}
