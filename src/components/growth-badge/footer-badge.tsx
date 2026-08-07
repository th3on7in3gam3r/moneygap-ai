import { SCORE_81_BADGE_HTML } from "@/components/growth-badge/score-81-badge-html";

/**
 * Site footer Growth Badge — exact embed HTML (Score™ 81 data-URI SVG).
 * Do not replace the data-URI image with an external URL.
 */
export function FooterGrowthBadge() {
  return (
    <span
      className="inline-block leading-none"
      // Exact vendor embed markup (anchor + data-URI img).
      dangerouslySetInnerHTML={{ __html: SCORE_81_BADGE_HTML }}
    />
  );
}
