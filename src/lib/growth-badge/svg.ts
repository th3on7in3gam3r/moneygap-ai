import { MG_BADGE_MARK_DATA_URI } from "@/lib/growth-badge/mg-mark-data";
import {
  badgeStyleLabel,
  badgeStyleMeta,
  BADGE_SVG_THEME as T,
} from "@/lib/growth-badge/styles";
import type { GrowthBadgeStyle } from "@/db/schema";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreTone(score: number, accent: string): string {
  if (score >= 80) return "#059669";
  if (score >= 65) return accent;
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

/** Compact live preview / embed SVG — style shortLabel is always visible. */
export function renderBadgeSvg(input: {
  style: GrowthBadgeStyle;
  score?: number | null;
  revoked?: boolean;
}): string {
  if (input.revoked) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64" role="img">
  <defs>
    <linearGradient id="mgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1c2e"/>
      <stop offset="100%" stop-color="#16324f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="279" height="63" rx="12" fill="url(#mgBg)" stroke="${T.border}"/>
  <text x="16" y="36" fill="${T.muted}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">Badge unavailable</text>
</svg>`;
  }

  const meta = badgeStyleMeta(input.style);
  const label = badgeStyleLabel(input.style);
  const title = meta.shortLabel;
  const accent = meta.accent;
  const score =
    input.score != null && Number.isFinite(input.score)
      ? Math.round(input.score)
      : null;
  const tone = score != null ? scoreTone(score, accent) : accent;
  const titleSize = title.length > 18 ? 11 : 13;

  const scoreBlock =
    score != null
      ? `<rect x="212" y="12" width="56" height="40" rx="10" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.55"/>
  <text x="240" y="28" text-anchor="middle" fill="${T.muted}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="8" font-weight="700" letter-spacing="0.08em">SCORE</text>
  <text x="240" y="46" text-anchor="middle" fill="${tone}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" font-weight="800">${score}</text>`
      : `<rect x="212" y="12" width="56" height="40" rx="10" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.55"/>
  <text x="240" y="36" text-anchor="middle" fill="${accent}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="700">MG</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="280" height="64" viewBox="0 0 280 64" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="mgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1c2e"/>
      <stop offset="100%" stop-color="#16324f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="279" height="63" rx="12" fill="url(#mgBg)" stroke="${accent}" stroke-opacity="0.45"/>
  <rect x="0" y="14" width="4" height="36" rx="2" fill="${accent}"/>
  <rect x="14" y="12" width="40" height="40" rx="10" fill="#ffffff"/>
  <image href="${MG_BADGE_MARK_DATA_URI}" xlink:href="${MG_BADGE_MARK_DATA_URI}" x="17" y="18" width="34" height="28" preserveAspectRatio="xMidYMid meet"/>
  <text x="66" y="26" fill="#94a3b8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="0.12em">MONEYGAP AI</text>
  <text x="66" y="46" fill="#f8fafc" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(title)}</text>
  ${scoreBlock}
</svg>`;
}

/** Data-URI for client-side style picker previews (no network). */
export function badgeSvgDataUri(input: {
  style: GrowthBadgeStyle;
  score?: number | null;
}): string {
  const svg = renderBadgeSvg(input);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
