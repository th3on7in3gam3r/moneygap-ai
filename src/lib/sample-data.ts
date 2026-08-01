export type GapSeverity = "critical" | "high" | "medium" | "low";
export type GapCategory =
  | "conversion"
  | "pricing"
  | "checkout"
  | "retention"
  | "traffic"
  | "messaging";

export type SampleMoneyGap = {
  id: string;
  category: GapCategory;
  title: string;
  description: string;
  severity: GapSeverity;
  estimatedImpact: number;
  confidence: number;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  recommendation: string;
};

export type SampleReport = {
  id: string;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  title: string;
  status: "ready" | "draft" | "archived";
  moneyGapScore: number;
  revenueAtRisk: number;
  capturePotential: number;
  summary: string;
  createdAt: string;
  gaps: SampleMoneyGap[];
};

export type SampleWebsite = {
  id: string;
  name: string;
  url: string;
  domain: string;
  status: "active" | "analyzing" | "queued";
  monthlyTraffic: number;
  estimatedRevenue: number;
  moneyGapScore: number;
  revenueAtRisk: number;
};

export type DailyPoint = {
  date: string;
  visitors: number;
  conversions: number;
  revenue: number;
  bounceRate: number;
};

export const DEMO_WORKSPACE = {
  id: "ws_demo_aurora",
  name: "Aurora Commerce",
  slug: "aurora-commerce",
  plan: "growth" as const,
};

export const SAMPLE_WEBSITES: SampleWebsite[] = [
  {
    id: "web_aurora",
    name: "Aurora Store",
    url: "https://aurora.store",
    domain: "aurora.store",
    status: "active",
    monthlyTraffic: 184200,
    estimatedRevenue: 312000,
    moneyGapScore: 68,
    revenueAtRisk: 47200,
  },
  {
    id: "web_northline",
    name: "Northline Apparel",
    url: "https://northline.co",
    domain: "northline.co",
    status: "active",
    monthlyTraffic: 96200,
    estimatedRevenue: 148000,
    moneyGapScore: 54,
    revenueAtRisk: 28100,
  },
  {
    id: "web_lumen",
    name: "Lumen SaaS",
    url: "https://getlumen.io",
    domain: "getlumen.io",
    status: "analyzing",
    monthlyTraffic: 41200,
    estimatedRevenue: 89000,
    moneyGapScore: 71,
    revenueAtRisk: 19400,
  },
];

export const SAMPLE_GAPS: SampleMoneyGap[] = [
  {
    id: "gap_1",
    category: "checkout",
    title: "Guest checkout friction on mobile",
    description:
      "Mobile sessions abandon at account-creation step 2.4× more than desktop. Guest path is buried below social login.",
    severity: "critical",
    estimatedImpact: 18400,
    confidence: 92,
    status: "open",
    recommendation:
      "Surface guest checkout as the primary CTA and defer account creation until post-purchase.",
  },
  {
    id: "gap_2",
    category: "pricing",
    title: "Annual plan under-emphasized",
    description:
      "Only 11% of pricing page visitors toggle to annual. Competitors convert 28–34% with clearer savings framing.",
    severity: "high",
    estimatedImpact: 12600,
    confidence: 87,
    status: "open",
    recommendation:
      "Default to annual billing with a savings badge and monthly as secondary toggle.",
  },
  {
    id: "gap_3",
    category: "conversion",
    title: "Hero CTA mismatch with intent",
    description:
      "High-intent search traffic lands on a brand story hero. Primary CTA (“Learn more”) underperforms “Start free trial” by 41%.",
    severity: "high",
    estimatedImpact: 9800,
    confidence: 84,
    status: "in_progress",
    recommendation:
      "Route paid and branded search to a conversion-focused hero with trial CTA.",
  },
  {
    id: "gap_4",
    category: "retention",
    title: "Onboarding drop after day 3",
    description:
      "42% of new accounts never complete the second activation milestone. Empty-state guidance is sparse.",
    severity: "medium",
    estimatedImpact: 7200,
    confidence: 79,
    status: "open",
    recommendation:
      "Add a 3-step activation checklist with progress nudges over the first week.",
  },
  {
    id: "gap_5",
    category: "messaging",
    title: "Value prop buried below fold",
    description:
      "Scroll depth shows 61% leave before seeing quantified outcomes. Above-fold copy is feature-led, not outcome-led.",
    severity: "medium",
    estimatedImpact: 5400,
    confidence: 76,
    status: "open",
    recommendation:
      "Lead with a measurable outcome headline and supporting proof point in the first viewport.",
  },
  {
    id: "gap_6",
    category: "traffic",
    title: "High-intent pages under-indexed",
    description:
      "Comparison and alternative pages receive 3.2× higher conversion but capture only 8% of organic clicks.",
    severity: "low",
    estimatedImpact: 3100,
    confidence: 71,
    status: "open",
    recommendation:
      "Expand comparison content and internal linking from top category pages.",
  },
];

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: "rpt_aurora_q2",
    websiteId: "web_aurora",
    websiteName: "Aurora Store",
    websiteDomain: "aurora.store",
    title: "Q2 Revenue Gap Audit",
    status: "ready",
    moneyGapScore: 68,
    revenueAtRisk: 47200,
    capturePotential: 31800,
    summary:
      "Aurora is leaving an estimated $47.2k/mo on the table. The largest levers are mobile checkout friction and annual plan framing.",
    createdAt: "2026-07-22T14:20:00.000Z",
    gaps: SAMPLE_GAPS,
  },
  {
    id: "rpt_northline_july",
    websiteId: "web_northline",
    websiteName: "Northline Apparel",
    websiteDomain: "northline.co",
    title: "July Conversion Gap Report",
    status: "ready",
    moneyGapScore: 54,
    revenueAtRisk: 28100,
    capturePotential: 19200,
    summary:
      "Northline’s PDP and cart flows underperform category peers. Size-guide friction and shipping clarity are primary gaps.",
    createdAt: "2026-07-18T09:10:00.000Z",
    gaps: [
      {
        id: "gap_n1",
        category: "conversion",
        title: "Size guide opens late",
        description:
          "Shoppers open the size guide after add-to-cart failures. Returns related to fit are elevated.",
        severity: "high",
        estimatedImpact: 11200,
        confidence: 88,
        status: "open",
        recommendation: "Inline size recommendation before add-to-cart on mobile PDPs.",
      },
      {
        id: "gap_n2",
        category: "checkout",
        title: "Shipping threshold opacity",
        description:
          "Free shipping threshold appears only in cart, not on product pages. Cart abandonment clusters near $8–12 under threshold.",
        severity: "medium",
        estimatedImpact: 8600,
        confidence: 82,
        status: "open",
        recommendation: "Surface remaining amount-to-free-shipping on PDP and mini-cart.",
      },
      {
        id: "gap_n3",
        category: "messaging",
        title: "Weak social proof near CTA",
        description:
          "Reviews load below fold. Peer sites with CTA-adjacent ratings convert 18% higher.",
        severity: "medium",
        estimatedImpact: 5300,
        confidence: 74,
        status: "in_progress",
        recommendation: "Pin aggregate rating and recent review snippet beside the buy button.",
      },
    ],
  },
  {
    id: "rpt_lumen_baseline",
    websiteId: "web_lumen",
    websiteName: "Lumen SaaS",
    websiteDomain: "getlumen.io",
    title: "Baseline Money Gap Snapshot",
    status: "draft",
    moneyGapScore: 71,
    revenueAtRisk: 19400,
    capturePotential: 14100,
    summary:
      "Early snapshot for Lumen. Pricing page and trial activation are the strongest opportunity clusters.",
    createdAt: "2026-07-28T16:45:00.000Z",
    gaps: SAMPLE_GAPS.slice(1, 4),
  },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildDailyMetrics(days = 30, seed = 42): DailyPoint[] {
  const rand = seededRandom(seed);
  const points: DailyPoint[] = [];
  const now = new Date("2026-07-31T12:00:00.000Z");

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const wave = Math.sin(i / 4) * 0.12;
    const trend = i / days * 0.08;
    const visitors = Math.round(5200 + rand() * 1800 + wave * 900 + trend * 800);
    const convRate = 0.024 + rand() * 0.01 + wave * 0.004;
    const conversions = Math.round(visitors * convRate);
    const aov = 68 + rand() * 22;
    const revenue = Math.round(conversions * aov);
    const bounceRate = Math.round((42 + rand() * 12 - wave * 4) * 10) / 10;

    points.push({
      date: d.toISOString().slice(0, 10),
      visitors,
      conversions,
      revenue,
      bounceRate,
    });
  }

  return points;
}

export const SAMPLE_METRICS = buildDailyMetrics(30, 42);

export function getReportById(id: string) {
  return SAMPLE_REPORTS.find((r) => r.id === id);
}

export function getWebsiteById(id: string) {
  return SAMPLE_WEBSITES.find((w) => w.id === id);
}

export const DASHBOARD_STATS = {
  revenueAtRisk: SAMPLE_WEBSITES.reduce((s, w) => s + w.revenueAtRisk, 0),
  capturePotential: SAMPLE_REPORTS.reduce((s, r) => s + r.capturePotential, 0),
  openGaps: SAMPLE_GAPS.filter((g) => g.status === "open" || g.status === "in_progress")
    .length,
  avgGapScore: Math.round(
    SAMPLE_WEBSITES.reduce((s, w) => s + w.moneyGapScore, 0) / SAMPLE_WEBSITES.length,
  ),
  websitesTracked: SAMPLE_WEBSITES.length,
  reportsReady: SAMPLE_REPORTS.filter((r) => r.status === "ready").length,
};
