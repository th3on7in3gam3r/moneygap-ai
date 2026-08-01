import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput } from "../types";

const TRUST_SIGNALS: { re: RegExp; label: string; weight: number; impact: number }[] = [
  { re: /testimonial|customer stor|what (our )?customers/i, label: "Testimonials", weight: 12, impact: 14000 },
  { re: /case stud/i, label: "Case studies", weight: 12, impact: 16000 },
  { re: /review|g2\.|capterra|trustpilot/i, label: "Reviews", weight: 10, impact: 12000 },
  { re: /logo|trusted by|companies that/i, label: "Logo / social proof", weight: 8, impact: 8000 },
  { re: /security|soc\s*2|gdpr|encryption/i, label: "Security signals", weight: 12, impact: 15000 },
  { re: /privacy/i, label: "Privacy", weight: 8, impact: 6000 },
  { re: /terms/i, label: "Terms", weight: 6, impact: 4000 },
  { re: /about/i, label: "About", weight: 8, impact: 7000 },
  { re: /contact|support@|help@/i, label: "Contact", weight: 8, impact: 5000 },
  { re: /status\.|system status/i, label: "Status page", weight: 6, impact: 4000 },
  { re: /support|help center|docs/i, label: "Support", weight: 10, impact: 7000 },
];

function corpus(pages: PageSeoSnapshot[]): string {
  return pages
    .map(
      (p) =>
        `${p.url} ${p.title ?? ""} ${p.metaDescription ?? ""} ${p.h1.join(" ")} ${p.h2.join(" ")}`,
    )
    .join("\n");
}

export function scoreTrust(pages: PageSeoSnapshot[]): ScoreResult {
  if (pages.length === 0) {
    return {
      score: null,
      unavailableReason: "No pages fetched — Trust Score unavailable.",
      findings: [],
    };
  }

  const text = corpus(pages);
  const findings: SelfOptFindingInput[] = [];
  let points = 0;
  let max = 0;

  for (const signal of TRUST_SIGNALS) {
    max += signal.weight;
    if (signal.re.test(text) || pages.some((p) => signal.re.test(p.url))) {
      points += signal.weight;
      continue;
    }
    findings.push({
      category: "trust",
      title: `Trust gap: ${signal.label}`,
      problem: `No clear ${signal.label.toLowerCase()} signal detected across scanned pages.`,
      businessImpact:
        "Enterprise and cautious buyers delay or abandon without visible proof.",
      whyItMatters: `${signal.label} reduces perceived risk before trial or paid conversion.`,
      estimatedOpportunity: signal.impact,
      estimateLabeled: "AI Estimate",
      confidence: 60,
      evidence: ["Heuristic scan of titles, headings, URLs, and meta text"],
      fixPath: `Add a visible ${signal.label.toLowerCase()} surface linked from marketing pages.`,
      difficulty: "medium",
      estimatedTime: "2–8 hours",
      verificationSteps: [
        `${signal.label} content live and linked`,
        "Visible above the fold or footer where appropriate",
      ],
    });
  }

  return { score: Math.round((points / max) * 100), findings };
}
