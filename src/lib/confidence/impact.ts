import type { ConfidenceIntelJson } from "@/db/schema";
import type { FindingLike } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** Impact Engine™ — all values labeled estimated */
export function computeImpact(f: FindingLike): ConfidenceIntelJson["impact"] {
  const revenue = f.estimatedAnnualRevenue ?? undefined;
  const seo = f.estimatedTraffic
    ? clampScore(Math.min(100, f.estimatedTraffic / 50))
    : undefined;
  const conversion = f.estimatedConversionLift ?? undefined;
  const trust =
    /trust|testimonial|review|social proof|authority/.test(
      `${f.category} ${f.title}`.toLowerCase(),
    )
      ? clampScore(40 + (f.expectedRoi ?? 3) * 8)
      : undefined;
  const authority =
    /backlink|seo|authority|content/.test(
      `${f.moduleId} ${f.category} ${f.title}`.toLowerCase(),
    )
      ? clampScore(35 + (f.expectedRoi ?? 3) * 7)
      : seo;
  const automation =
    /automat|email|newsletter|crm|workflow/.test(
      `${f.category} ${f.title}`.toLowerCase(),
    )
      ? clampScore(30 + (f.expectedRoi ?? 3) * 8)
      : undefined;

  const parts: string[] = [];
  if (revenue) parts.push(`~$${revenue.toLocaleString()} annual revenue`);
  if (conversion) parts.push(`~${conversion}% conversion lift`);
  if (f.estimatedLeads) parts.push(`~${f.estimatedLeads} leads`);
  if (f.estimatedTraffic) parts.push(`~${f.estimatedTraffic} traffic`);

  return {
    labeled: "estimated",
    revenue,
    seo,
    trust,
    conversion,
    authority,
    automation,
    summary:
      parts.length > 0
        ? `Estimated outcomes: ${parts.join("; ")}.`
        : f.businessImpact?.slice(0, 200) ||
          "Estimated outcomes unavailable — treat figures as directional.",
  };
}
