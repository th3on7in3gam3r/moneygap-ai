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
    label: "Running Revenue & Conversion Intelligence…",
    progress: 76,
  },
  {
    id: "quantifying",
    label: "Running SEO, Content & Trust Intelligence…",
    progress: 86,
  },
  {
    id: "action_plans",
    label: "Building Growth Roadmap & scoring…",
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
  "Analysis requires FIRECRAWL_API_KEY and OPENAI_API_KEY. Add them to your environment and try again.";
