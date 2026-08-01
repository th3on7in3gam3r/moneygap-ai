import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput } from "../types";

export function scorePerformance(pages: PageSeoSnapshot[]): ScoreResult {
  const withTtfb = pages.filter((p) => p.ttfbMs != null && p.status === 200);
  if (withTtfb.length === 0) {
    return {
      score: null,
      unavailableReason:
        "Core Web Vitals provider not connected; no successful page timings captured.",
      findings: [],
    };
  }

  const findings: SelfOptFindingInput[] = [];
  const avg =
    withTtfb.reduce((s, p) => s + (p.ttfbMs ?? 0), 0) / withTtfb.length;

  // Simple proxy only — not CWV. Cap honesty in evidence.
  let score = 90;
  if (avg > 800) score = 70;
  if (avg > 1500) score = 50;
  if (avg > 3000) score = 35;

  if (avg > 1500) {
    findings.push({
      category: "performance",
      title: "Slow server response (TTFB proxy)",
      problem: `Average TTFB across scanned pages is ~${Math.round(avg)}ms.`,
      businessImpact: "Slower pages reduce conversion and SEO engagement signals.",
      whyItMatters: "Performance issues compound bounce and ranking risk.",
      estimatedOpportunity: 10000,
      estimateLabeled: "AI Estimate",
      confidence: 55,
      evidence: [
        `Avg TTFB ~${Math.round(avg)}ms (fetch proxy, not Lighthouse CWV)`,
        ...withTtfb.slice(0, 5).map((p) => `${p.url}: ${p.ttfbMs}ms`),
      ],
      fixPath:
        "Investigate edge caching, SSR timing, and heavy server work on marketing routes.",
      difficulty: "hard",
      estimatedTime: "1–3 days",
      verificationSteps: [
        "Re-scan TTFB under 800ms median",
        "Connect CWV provider for LCP/INP/CLS when available",
      ],
    });
  }

  const heavy = pages.filter((p) => p.htmlLength > 500_000);
  if (heavy.length > 0) {
    score = Math.min(score, 60);
    findings.push({
      category: "performance",
      title: "Very large HTML payload",
      problem: `${heavy.length} page(s) exceed ~500KB HTML.`,
      businessImpact: "Large documents hurt mobile conversion and crawl efficiency.",
      whyItMatters: "Payload size is a controllable performance budget item.",
      estimatedOpportunity: 6000,
      estimateLabeled: "AI Estimate",
      confidence: 62,
      evidence: heavy.slice(0, 3).map((p) => `${p.url}: ${p.htmlLength} bytes`),
      fixPath: "Reduce inline assets, defer non-critical scripts, paginate heavy content.",
      difficulty: "medium",
      estimatedTime: "4–12 hours",
      verificationSteps: ["HTML weight reduced", "Lighthouse when connected"],
      pageUrl: heavy[0]?.url,
    });
  }

  return {
    score,
    findings,
    unavailableReason:
      "Full Core Web Vitals not available — score uses fetch TTFB/HTML size proxies only.",
  };
}
