import { MG_BADGE_MARK_DATA_URI } from "@/lib/growth-badge/mg-mark-data";
import { badgeStyleLabel, BADGE_STYLES, BADGE_SVG_THEME as T } from "@/lib/growth-badge/styles";
import type { GrowthBadgeStyle } from "@/db/schema";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortLabel(style: GrowthBadgeStyle): string {
  return BADGE_STYLES.find((s) => s.id === style)?.shortLabel ?? badgeStyleLabel(style);
}

function scoreTone(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 65) return "#0d9488";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

export function renderBadgeSvg(input: {
  style: GrowthBadgeStyle;
  score?: number | null;
  revoked?: boolean;
}): string {
  if (input.revoked) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56" role="img">
  <defs>
    <linearGradient id="mgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1c2e"/>
      <stop offset="100%" stop-color="#16324f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="219" height="55" rx="12" fill="url(#mgBg)" stroke="${T.border}"/>
  <text x="16" y="32" fill="${T.muted}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">Badge unavailable</text>
</svg>`;
  }

  const label = badgeStyleLabel(input.style);
  const subtitle =
    input.score != null && Number.isFinite(input.score)
      ? "Score™"
      : shortLabel(input.style);
  const score =
    input.score != null && Number.isFinite(input.score)
      ? Math.round(input.score)
      : null;
  const tone = score != null ? scoreTone(score) : T.accent;

  const scoreEl =
    score != null
      ? `<text x="208" y="36" text-anchor="end" fill="${tone}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="800">${score}</text>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="220" height="56" viewBox="0 0 220 56" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="mgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1c2e"/>
      <stop offset="100%" stop-color="#16324f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="219" height="55" rx="12" fill="url(#mgBg)" stroke="${T.border}"/>
  <rect x="8" y="8" width="40" height="40" rx="10" fill="#ffffff"/>
  <image href="${MG_BADGE_MARK_DATA_URI}" xlink:href="${MG_BADGE_MARK_DATA_URI}" x="11" y="14" width="34" height="28" preserveAspectRatio="xMidYMid meet"/>
  <text x="60" y="22" fill="#94a3b8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="0.12em">MONEYGAP AI</text>
  <text x="60" y="40" fill="#f8fafc" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700">${escapeXml(subtitle)}</text>
  ${scoreEl}
</svg>`;
}
