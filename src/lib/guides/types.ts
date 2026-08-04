export type GuideDifficulty = "beginner" | "intermediate" | "advanced";

export type GuideCategory =
  | "performance"
  | "seo"
  | "ai"
  | "metadata"
  | "structured-data"
  | "crawl"
  | "a11y"
  | "media"
  | "infra"
  | "growth"
  | "security";

export type FrameworkId =
  | "nextjs"
  | "react"
  | "astro"
  | "remix"
  | "nuxt"
  | "vue"
  | "angular"
  | "sveltekit"
  | "laravel"
  | "rails"
  | "wordpress"
  | "shopify";

export type TopicId =
  | "core-web-vitals"
  | "seo"
  | "ai-readiness"
  | "llms-txt"
  | "metadata"
  | "open-graph"
  | "twitter-cards"
  | "schema-org"
  | "faq-schema"
  | "organization-schema"
  | "canonical-urls"
  | "robots-txt"
  | "sitemap-xml"
  | "accessibility"
  | "image-optimization"
  | "hydration"
  | "performance"
  | "caching"
  | "fonts"
  | "routing"
  | "security-headers"
  | "structured-data"
  | "deployment"
  | "analytics"
  | "conversion-optimization"
  | "trust-signals";

export type FrameworkMeta = {
  id: FrameworkId;
  slug: string;
  name: string;
  ecosystem: string[];
  summary: string;
};

export type TopicMeta = {
  id: TopicId;
  slug: string;
  name: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  tags: string[];
  summary: string;
};

export type GuideFrontmatter = {
  title?: string;
  description?: string;
  difficulty?: GuideDifficulty;
  tags?: string[];
  cliCommands?: string[];
  updated?: string;
};

export type GuideSections = {
  problemOverview?: string;
  whyItMatters?: string;
  frameworkExplanation?: string;
  steps?: string;
  codeExamples?: string;
  commonMistakes?: string;
  validationChecklist?: string;
  aiReadinessNotes?: string;
  deploymentChecklist?: string;
  extensionTips?: string;
  /** leftover markdown not mapped to a known heading */
  extra?: string;
};

export type GuideModel = {
  framework: FrameworkMeta;
  topic: TopicMeta;
  title: string;
  description: string;
  difficulty: GuideDifficulty;
  tags: string[];
  cliCommands: string[];
  updated: string | null;
  sections: GuideSections;
  path: string;
};

export type GuideSearchHit = {
  frameworkId: FrameworkId;
  topicId: TopicId;
  path: string;
  title: string;
  description: string;
  frameworkName: string;
  topicName: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  tags: string[];
  cliCommands: string[];
  body: string;
};
