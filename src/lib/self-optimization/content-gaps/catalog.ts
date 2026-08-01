import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput } from "../types";

/** Expected MoneyGap marketing / product surface paths. */
export const EXPECTED_CONTENT_PATHS: {
  path: string;
  label: string;
  impact: number;
}[] = [
  { path: "/", label: "Home", impact: 0 },
  { path: "/pricing", label: "Pricing", impact: 25000 },
  { path: "/about", label: "About", impact: 8000 },
  { path: "/features", label: "Features", impact: 20000 },
  { path: "/integrations", label: "Integrations", impact: 15000 },
  { path: "/api", label: "API", impact: 12000 },
  { path: "/docs", label: "Documentation", impact: 18000 },
  { path: "/developers", label: "Developers", impact: 10000 },
  { path: "/blog", label: "Blog", impact: 14000 },
  { path: "/academy", label: "Academy", impact: 9000 },
  { path: "/security", label: "Security", impact: 11000 },
  { path: "/privacy", label: "Privacy", impact: 7000 },
  { path: "/terms", label: "Terms", impact: 5000 },
  { path: "/contact", label: "Contact", impact: 6000 },
  { path: "/customers", label: "Case Studies / Customers", impact: 16000 },
  { path: "/alternatives", label: "Alternatives", impact: 13000 },
  { path: "/compare", label: "Competitor Comparisons", impact: 13000 },
  { path: "/industries", label: "Industries", impact: 10000 },
  { path: "/use-cases", label: "Use Cases", impact: 10000 },
  { path: "/changelog", label: "Changelog", impact: 4000 },
  { path: "/roadmap", label: "Roadmap", impact: 4000 },
  { path: "/status", label: "Status", impact: 5000 },
  { path: "/support", label: "Support", impact: 7000 },
];

function pathExists(pages: PageSeoSnapshot[], path: string): boolean {
  if (path === "/") {
    return pages.some((p) => {
      try {
        const u = new URL(p.url);
        return (u.pathname === "/" || u.pathname === "") && p.status === 200;
      } catch {
        return false;
      }
    });
  }
  const needle = path.toLowerCase();
  return pages.some((p) => {
    if (p.status !== 200) return false;
    try {
      const pathname = new URL(p.url).pathname.toLowerCase().replace(/\/$/, "") || "/";
      return pathname === needle || pathname.startsWith(`${needle}/`);
    } catch {
      return p.url.toLowerCase().includes(needle);
    }
  });
}

export function scoreContentCoverage(pages: PageSeoSnapshot[]): ScoreResult {
  const findings: SelfOptFindingInput[] = [];
  const required = EXPECTED_CONTENT_PATHS.filter((p) => p.path !== "/");
  let present = 0;

  for (const item of required) {
    if (pathExists(pages, item.path)) {
      present += 1;
      continue;
    }
    findings.push({
      category: "content",
      title: `Missing page: ${item.label}`,
      problem: `No live page found at ${item.path}.`,
      businessImpact:
        "Prospects searching for this topic bounce or choose a clearer competitor.",
      whyItMatters: `${item.label} content closes a funnel or trust gap for SaaS buyers.`,
      estimatedOpportunity: item.impact,
      estimateLabeled: "AI Estimate",
      confidence: 70,
      evidence: [`Expected path ${item.path}`, "Not found among scanned URLs with HTTP 200"],
      fixPath: `Publish a ${item.label} page at ${item.path} with clear CTA and MoneyGap positioning.`,
      difficulty: "medium",
      estimatedTime: "4–16 hours",
      verificationSteps: [
        `GET ${item.path} returns 200`,
        "Page linked from nav or footer",
        "Indexed in sitemap",
      ],
      pageUrl: item.path,
    });
  }

  const score =
    required.length === 0
      ? null
      : Math.round((present / required.length) * 100);

  return {
    score,
    unavailableReason:
      pages.length === 0
        ? "No pages scanned — content coverage unavailable."
        : undefined,
    findings: pages.length === 0 ? [] : findings,
  };
}

export function pathsToProbe(): string[] {
  return EXPECTED_CONTENT_PATHS.map((p) => p.path);
}
