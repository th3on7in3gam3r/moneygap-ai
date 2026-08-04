import type { SelfOptPrompts } from "@/db/schema";

export type SelfOptFindingInput = {
  category: string;
  title: string;
  problem: string;
  businessImpact: string;
  whyItMatters: string;
  estimatedOpportunity: number | null;
  estimateLabeled?: string;
  confidence: number;
  evidence: string[];
  fixPath: string;
  difficulty: string;
  estimatedTime: string;
  verificationSteps: string[];
  priority?: string | null;
  pageUrl?: string | null;
  prompts?: SelfOptPrompts | null;
  metadataDraftId?: string | null;
  opportunityId?: string | null;
};

export type PageSeoSnapshot = {
  url: string;
  status: number | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  h1: string[];
  h2: string[];
  imagesMissingAlt: number;
  imageCount: number;
  internalLinks: number;
  externalLinks: number;
  jsonLdTypes: string[];
  hasMain: boolean;
  hasNav: boolean;
  hasFooter: boolean;
  htmlLength: number;
  ttfbMs: number | null;
};

export type SiteFilesResult = {
  robotsOk: boolean;
  robotsStatus: number | null;
  robotsBody: string | null;
  sitemapOk: boolean;
  sitemapStatus: number | null;
  sitemapBody: string | null;
  llmsOk: boolean;
  llmsStatus: number | null;
  llmsBody: string | null;
  llmsValidationScore: number | null;
};

export type ScoreResult = {
  score: number | null;
  unavailableReason?: string;
  findings: SelfOptFindingInput[];
};
