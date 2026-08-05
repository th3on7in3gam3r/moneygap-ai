import { discoverOnly } from "moneygap-crawler";
import { verifyUrlReachable } from "@/lib/analysis/url";
import {
  estimateEtaSeconds,
  formatEtaSeconds,
  recommendProfile,
  SCAN_PROFILES,
} from "./profiles";
import type { EstimateResult, ScanProfile } from "./types";

function complexityFromPages(
  pages: number,
  jsRequired: boolean,
  linkDensity: number,
): "low" | "medium" | "high" {
  if (pages > 2_000 || (jsRequired && pages > 200)) return "high";
  if (pages > 80 || linkDensity > 80 || jsRequired) return "medium";
  return "low";
}

function guidanceFor(
  profile: ScanProfile,
  estimatedPages: number,
  complexity: "low" | "medium" | "high",
): string {
  if (profile === "quick") {
    return "This appears to be a small or brochure-style site. A Quick Scan will provide nearly all available insights.";
  }
  if (profile === "standard") {
    return `This website contains approximately ${estimatedPages.toLocaleString()} pages. A Standard Scan is recommended for a comprehensive audit while minimizing scan duration.`;
  }
  if (profile === "deep") {
    return "This site looks large (documentation, ecommerce, or many indexed URLs). A Deep Scan is recommended and runs incrementally so it can resume if interrupted.";
  }
  return `Complexity is ${complexity} with ~${estimatedPages.toLocaleString()} estimated pages. Enterprise Scan uses incremental processing and may take longer to complete.`;
}

export async function estimateScan(rawUrl: string): Promise<
  | { ok: true; estimate: EstimateResult }
  | { ok: false; error: string; code?: string }
> {
  const validated = await verifyUrlReachable(rawUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error, code: validated.code };
  }

  const discovery = await discoverOnly({
    url: validated.value.href,
    mode: "standard",
    maxPages: 2_000,
    maxRuntimeMs: 12_000,
  });

  const estimatedPages = Math.max(
    discovery.urls.length,
    discovery.sitemapUrlCount || 0,
    discovery.homepageLinkCount || 1,
    1,
  );

  const complexity = complexityFromPages(
    estimatedPages,
    discovery.jsRequired,
    discovery.homepageLinkCount,
  );
  const recommendedProfile = recommendProfile(estimatedPages, complexity);

  const etaByProfile = {} as EstimateResult["etaByProfile"];
  for (const id of Object.keys(SCAN_PROFILES) as ScanProfile[]) {
    const etaSeconds = estimateEtaSeconds(id, estimatedPages);
    etaByProfile[id] = {
      label: SCAN_PROFILES[id].label,
      etaSeconds,
      etaLabel: formatEtaSeconds(etaSeconds),
    };
  }

  // Simple future-billing heuristic: 1 unit per 10 pages at recommended depth
  const estimatedCostUnits = Math.max(
    1,
    Math.ceil(Math.min(estimatedPages, SCAN_PROFILES[recommendedProfile].maxPages) / 10),
  );

  return {
    ok: true,
    estimate: {
      url: validated.value.href,
      domain: validated.value.domain,
      estimatedPages,
      complexity,
      framework: discovery.framework,
      sitemapFound: discovery.sitemapFound,
      jsRequired: discovery.jsRequired,
      recommendedProfile,
      guidance: guidanceFor(recommendedProfile, estimatedPages, complexity),
      estimatedCostUnits,
      etaByProfile,
      signals: {
        sitemapUrlCount: discovery.sitemapUrlCount,
        homepageLinkCount: discovery.homepageLinkCount,
        robotsFound: discovery.robotsFound,
      },
    },
  };
}
