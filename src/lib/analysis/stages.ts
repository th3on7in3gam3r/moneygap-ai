export const ANALYSIS_STAGES = [
  {
    id: "connecting",
    label: "Connecting to website",
    progress: 6,
  },
  {
    id: "reading",
    label: "Reading pages",
    progress: 18,
  },
  {
    id: "understanding",
    label: "Understanding business",
    progress: 32,
  },
  {
    id: "extracting",
    label: "Extracting products",
    progress: 42,
  },
  {
    id: "audience",
    label: "Identifying audience",
    progress: 50,
  },
  {
    id: "content",
    label: "Reviewing content",
    progress: 58,
  },
  {
    id: "preparing",
    label: "Preparing intelligence report",
    progress: 66,
  },
  {
    id: "detecting_gaps",
    label: "Scoring MoneyGap Categories™…",
    progress: 76,
  },
  {
    id: "quantifying",
    label: "Deepening category findings…",
    progress: 86,
  },
  {
    id: "action_plans",
    label: "Building Fix Roadmap & prompts…",
    progress: 88,
  },
  {
    id: "discovering_competitors",
    label: "Discovering competitors…",
    progress: 91,
  },
  {
    id: "profiling_competitors",
    label: "Profiling competitor businesses…",
    progress: 95,
  },
  {
    id: "competitive_analysis",
    label: "Building competitive strategy…",
    progress: 98,
  },
] as const;

export type AnalysisStageId = (typeof ANALYSIS_STAGES)[number]["id"];

/**
 * Fault-tolerant scan engine stages (progress reporting / diagnostics).
 * Soft-fail: mark failed in scanMeta.stageDiagnostics and continue when possible.
 */
export const SCAN_ENGINE_STAGES = [
  { id: "connect", label: "Connect", progress: 6 },
  { id: "discover", label: "Discover URLs", progress: 10 },
  { id: "read_pages", label: "Read Pages", progress: 18 },
  { id: "extract_content", label: "Extract Content", progress: 32 },
  { id: "business_intelligence", label: "Business Intelligence", progress: 42 },
  { id: "revenue_intelligence", label: "Revenue Intelligence", progress: 76 },
  { id: "money_gap_engine", label: "Money Gap Engine", progress: 88 },
  { id: "generate_report", label: "Generate Report", progress: 100 },
] as const;

export type ScanEngineStageId = (typeof SCAN_ENGINE_STAGES)[number]["id"];

export type StageDiagnostic = {
  stage: ScanEngineStageId | string;
  status: "ok" | "failed" | "skipped";
  detail?: string;
  completed?: number;
  failed?: number;
};

export const PAGE_TYPES = [
  "homepage",
  "nav",
  "about",
  "services",
  "products",
  "pricing",
  "blog",
  "contact",
  "faq",
  "resources",
  "other",
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export const PUBLIC_CRAWL_ERROR =
  "We couldn't analyze this website. Please confirm the URL is publicly accessible.";

export const AI_GENERATION_ERROR =
  "Intelligence generation failed. Please try again.";

export const MONEY_GAP_ENGINE_ERROR =
  "Money Gap Engine could not finish. Your business understanding is ready — retry opportunity detection when you can.";

export const COMPETITIVE_ENGINE_ERROR =
  "Competitive Intelligence could not finish. Your growth opportunities are ready — retry competitive analysis when you can.";

export const MISSING_KEYS_ERROR =
  "Analysis requires OPENAI_API_KEY. Add it to your environment and try again. FIRECRAWL_API_KEY is optional (fallback crawl).";
