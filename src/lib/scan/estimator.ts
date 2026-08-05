import { runConnectivityDiagnostics } from "@/lib/scan/connectivity";
import type { ConnectivityDiagnostics } from "@/lib/scan/connectivity";
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

function jsRequiredFromFramework(framework: string | null): boolean {
  if (!framework) return false;
  return ["nextjs", "nuxt", "angular", "spa", "react", "vue", "svelte"].includes(
    framework,
  );
}

export async function estimateScan(rawUrl: string): Promise<
  | { ok: true; estimate: EstimateResult; diagnostics: ConnectivityDiagnostics }
  | {
      ok: false;
      error: string;
      code?: string;
      diagnostics: ConnectivityDiagnostics;
    }
> {
  const diagnostics = await runConnectivityDiagnostics(rawUrl);
  if (!diagnostics.ok || !diagnostics.value) {
    return {
      ok: false,
      error: diagnostics.summary,
      code: diagnostics.code ?? "unreachable",
      diagnostics,
    };
  }

  const value = diagnostics.value;
  const estimatedPages = Math.max(diagnostics.estimatedPages ?? 1, 1);
  const framework = diagnostics.detectedFramework ?? "unknown";
  const jsRequired = jsRequiredFromFramework(diagnostics.detectedFramework);
  const linkDensity = estimatedPages; // proxy from connectivity estimate
  const complexity = complexityFromPages(estimatedPages, jsRequired, linkDensity);
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

  const estimatedCostUnits = Math.max(
    1,
    Math.ceil(
      Math.min(estimatedPages, SCAN_PROFILES[recommendedProfile].maxPages) / 10,
    ),
  );

  const sitemapOk = /^2\d\d/.test(diagnostics.sitemap);
  const robotsOk = /^2\d\d/.test(diagnostics.robots);

  return {
    ok: true,
    diagnostics,
    estimate: {
      url: value.href,
      domain: value.domain,
      estimatedPages,
      complexity,
      framework,
      sitemapFound: sitemapOk,
      jsRequired,
      recommendedProfile,
      guidance: guidanceFor(recommendedProfile, estimatedPages, complexity),
      estimatedCostUnits,
      etaByProfile,
      signals: {
        sitemapUrlCount: diagnostics.sitemapUrlCount ?? 0,
        homepageLinkCount: diagnostics.homepageLinkCount ?? estimatedPages,
        robotsFound: robotsOk,
      },
      connectivity: diagnostics,
      warnings: diagnostics.warnings,
    },
  };
}
