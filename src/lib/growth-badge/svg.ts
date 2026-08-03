import { badgeStyleLabel, BADGE_SVG_THEME as T } from "@/lib/growth-badge/styles";
import type { GrowthBadgeStyle } from "@/db/schema";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLabel(label: string, maxChars = 28): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

export function renderBadgeSvg(input: {
  style: GrowthBadgeStyle;
  score?: number | null;
  revoked?: boolean;
}): string {
  if (input.revoked) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56" role="img">
  <rect width="220" height="56" rx="10" fill="${T.bg}" stroke="${T.border}"/>
  <text x="16" y="32" fill="${T.muted}" font-family="system-ui,sans-serif" font-size="12">Badge unavailable</text>
</svg>`;
  }

  const label = badgeStyleLabel(input.style);
  const lines = wrapLabel(label, 26);
  const score =
    input.score != null && Number.isFinite(input.score)
      ? Math.round(input.score)
      : null;

  const lineEls = lines
    .map(
      (line, i) =>
        `<text x="52" y="${24 + i * 14}" fill="${T.fg}" font-family="system-ui,sans-serif" font-size="11" font-weight="600">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  const scoreEl =
    score != null
      ? `<rect x="168" y="14" width="40" height="28" rx="6" fill="${T.accentSoft}" stroke="${T.accent}"/>
  <text x="188" y="33" text-anchor="middle" fill="${T.accent}" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${score}</text>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56" role="img" aria-label="${escapeXml(label)}">
  <rect width="220" height="56" rx="10" fill="${T.bg}" stroke="${T.border}"/>
  <rect x="10" y="12" width="32" height="32" rx="8" fill="${T.accent}"/>
  <path d="M18 34 L24 22 L28 28 L36 18" fill="none" stroke="${T.fg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  ${lineEls}
  ${scoreEl}
</svg>`;
}
