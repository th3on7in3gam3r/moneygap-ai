import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput } from "../types";

export function scoreConversion(pages: PageSeoSnapshot[]): ScoreResult {
  if (pages.length === 0) {
    return {
      score: null,
      unavailableReason: "No pages fetched — Conversion Score unavailable.",
      findings: [],
    };
  }

  const home =
    pages.find((p) => {
      try {
        const path = new URL(p.url).pathname;
        return path === "/" || path === "";
      } catch {
        return false;
      }
    }) ?? pages[0]!;

  const blob = `${home.title ?? ""} ${home.metaDescription ?? ""} ${home.h1.join(" ")} ${home.h2.join(" ")}`;
  const findings: SelfOptFindingInput[] = [];
  let points = 0;
  let max = 0;

  const checks: {
    ok: boolean;
    weight: number;
    finding?: SelfOptFindingInput;
  }[] = [
    {
      ok: home.h1.length > 0,
      weight: 15,
      finding: {
        category: "conversion",
        title: "Hero lacks a clear H1 value proposition",
        problem: "Homepage has no H1 to anchor the primary offer.",
        businessImpact: "Visitors take longer to understand MoneyGap → lower activation.",
        whyItMatters: "Hero clarity is the first conversion lever.",
        estimatedOpportunity: 20000,
        estimateLabeled: "AI Estimate",
        confidence: 72,
        evidence: [home.url],
        fixPath: "Add one benefit-led H1 above the fold with a single primary CTA.",
        difficulty: "easy",
        estimatedTime: "1–2 hours",
        verificationSteps: ["H1 visible above fold", "CTA adjacent to hero"],
        pageUrl: home.url,
      },
    },
    {
      ok: /start free|get started|try|sign up|analyze/i.test(blob),
      weight: 20,
      finding: {
        category: "conversion",
        title: "Primary CTA unclear in hero signals",
        problem: "No strong primary CTA language detected in homepage headings/meta.",
        businessImpact: "Fewer trial starts from high-intent traffic.",
        whyItMatters: "CTA clarity drives signup conversion.",
        estimatedOpportunity: 28000,
        estimateLabeled: "AI Estimate",
        confidence: 65,
        evidence: [home.url, `snippet: ${blob.slice(0, 160)}`],
        fixPath: "Place a single primary CTA (e.g. Start free / Analyze) in the hero.",
        difficulty: "easy",
        estimatedTime: "1 hour",
        verificationSteps: ["Primary CTA contrast and copy tested"],
        pageUrl: home.url,
      },
    },
    {
      ok: pages.some((p) => /pricing/i.test(p.url) && p.status === 200),
      weight: 15,
      finding: {
        category: "conversion",
        title: "Pricing path weak or missing",
        problem: "No successful /pricing page in the scan set.",
        businessImpact: "Buyers cannot self-serve evaluate plans.",
        whyItMatters: "Pricing clarity shortens sales cycles.",
        estimatedOpportunity: 22000,
        estimateLabeled: "AI Estimate",
        confidence: 75,
        evidence: ["Scanned paths lack a 200 /pricing response"],
        fixPath: "Ship a clear pricing page with plan comparison and CTA.",
        difficulty: "medium",
        estimatedTime: "4–8 hours",
        verificationSteps: ["/pricing returns 200", "CTA to signup present"],
      },
    },
    {
      ok: /faq|frequently asked/i.test(blob) ||
        pages.some((p) => /faq/i.test(p.url) && p.status === 200),
      weight: 10,
      finding: {
        category: "conversion",
        title: "FAQ / objection handling missing",
        problem: "No FAQ signals on home or dedicated FAQ route.",
        businessImpact: "Unanswered objections stall conversions.",
        whyItMatters: "FAQs lift conversion and AI visibility.",
        estimatedOpportunity: 9000,
        estimateLabeled: "AI Estimate",
        confidence: 60,
        evidence: [home.url],
        fixPath: "Add FAQ section or /faq with schema markup.",
        difficulty: "medium",
        estimatedTime: "3–6 hours",
        verificationSteps: ["FAQ live", "FAQPage JSON-LD optional but preferred"],
        pageUrl: home.url,
      },
    },
    {
      ok: home.hasNav,
      weight: 10,
    },
    {
      ok: /testimonial|customer|trusted|case stud/i.test(blob),
      weight: 15,
      finding: {
        category: "conversion",
        title: "Social proof weak on homepage",
        problem: "Little social proof language detected near hero signals.",
        businessImpact: "Lower trust → lower CTA click-through.",
        whyItMatters: "Proof next to CTA improves conversion.",
        estimatedOpportunity: 12000,
        estimateLabeled: "AI Estimate",
        confidence: 58,
        evidence: [home.url],
        fixPath: "Add logos, quotes, or metrics beside the primary CTA.",
        difficulty: "medium",
        estimatedTime: "2–4 hours",
        verificationSteps: ["Social proof visible without scroll on desktop"],
        pageUrl: home.url,
      },
    },
    {
      ok: home.hasMain && home.hasFooter,
      weight: 15,
    },
  ];

  for (const c of checks) {
    max += c.weight;
    if (c.ok) points += c.weight;
    else if (c.finding) findings.push(c.finding);
  }

  return { score: Math.round((points / max) * 100), findings };
}
