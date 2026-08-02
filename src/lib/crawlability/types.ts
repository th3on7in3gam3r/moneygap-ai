/** Crawlability Score™ — shared types (higher score = healthier crawlability). */

export type CrawlabilityStatus =
  | "Excellent"
  | "Good"
  | "Needs Attention"
  | "Critical";

export type CrawlabilityPriority = "critical" | "high" | "medium" | "low";

export type CrawlabilityContributorKey =
  | "robots"
  | "sitemap"
  | "canonical"
  | "internalLinks"
  | "redirects"
  | "indexability";

export type CrawlabilityContributors = Record<
  CrawlabilityContributorKey,
  number | null
>;

export type CrawlabilityFinding = {
  category: "crawlability";
  title: string;
  problem: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedOpportunity: number | null;
  estimateLabeled: string;
  confidence: number;
  evidence: string[];
  priority: CrawlabilityPriority;
  fixPath: string;
  difficulty: string;
  estimatedTime: string;
  verificationSteps: string[];
  pageUrl?: string | null;
  contributor?: CrawlabilityContributorKey;
};

export type RobotsProbeResult = {
  ok: boolean;
  status: number | null;
  body: string | null;
  blocksAll: boolean;
  blocksHomepage: boolean;
  sitemapDirectives: string[];
  disallowPaths: string[];
};

export type SitemapProbeResult = {
  ok: boolean;
  status: number | null;
  body: string | null;
  validXml: boolean;
  isIndex: boolean;
  urlCount: number;
  urls: string[];
  lastmodDates: string[];
  fresh: boolean | null;
};

export type PageCrawlSnapshot = {
  url: string;
  finalUrl: string;
  status: number | null;
  htmlLength: number;
  title: string | null;
  canonical: string | null;
  metaRobots: string | null;
  xRobotsTag: string | null;
  hreflang: { lang: string; href: string }[];
  hasNav: boolean;
  hasBreadcrumbMarkup: boolean;
  hasBreadcrumbJsonLd: boolean;
  jsonLdTypes: string[];
  internalHrefs: string[];
  soft404Suspect: boolean;
  https: boolean;
  redirectChain: RedirectHop[];
  redirectLoop: boolean;
  paginationRel: { next: string | null; prev: string | null };
  scriptHeavy: boolean;
};

export type RedirectHop = {
  url: string;
  status: number;
  location: string | null;
};

export type LlmsTxtProbe = {
  ok: boolean;
  status: number | null;
};

export type CrawlabilityEvidence = {
  origin: string;
  robots: RobotsProbeResult;
  sitemap: SitemapProbeResult;
  pages: PageCrawlSnapshot[];
  llmsTxt: LlmsTxtProbe;
  brokenInternal: { from: string; to: string; status: number | null }[];
  orphans: string[];
  maxDepth: number | null;
  urlConsistencyIssues: string[];
  duplicateUrlGroups: string[][];
};

export type CrawlabilityResult = {
  score: number | null;
  status: CrawlabilityStatus | null;
  contributors: CrawlabilityContributors;
  findings: CrawlabilityFinding[];
  unavailableReasons: Record<string, string>;
  executiveSummary: string;
  estimatedImprovement: string;
  evidence?: CrawlabilityEvidence;
};

export type RunCrawlabilityAuditOptions = {
  /** Extra paths or absolute URLs to probe (capped). */
  paths?: string[];
  /** Pre-known URLs from Firecrawl map / sitemap (capped). */
  knownUrls?: string[];
  /** Max pages to deeply probe (HTML + headers). Default 12. */
  maxPages?: number;
  /** Max internal links to HEAD-check. Default 20. */
  maxLinkChecks?: number;
  /** Workspace id for integration lookups (optional). */
  workspaceId?: string;
};
