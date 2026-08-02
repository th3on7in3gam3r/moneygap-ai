/** Privacy Score™ — higher = healthier privacy posture. */

export type PrivacyStatus =
  | "Excellent"
  | "Good"
  | "Needs Attention"
  | "Critical";

export type PrivacyPriority = "critical" | "high" | "medium" | "low";

export type PrivacyContributorKey =
  | "consentUx"
  | "cookieSecurity"
  | "policyDocs"
  | "trackingHygiene"
  | "thirdPartyExposure"
  | "consentStorage";

export type PrivacyContributors = Record<PrivacyContributorKey, number | null>;

export type PrivacyFinding = {
  category: "privacy";
  title: string;
  problem: string;
  whyItMatters: string;
  businessImpact: string;
  estimatedOpportunity: number | null;
  estimateLabeled: string;
  confidence: number;
  evidence: string[];
  priority: PrivacyPriority;
  fixPath: string;
  difficulty: string;
  estimatedTime: string;
  verificationSteps: string[];
  pageUrl?: string | null;
  contributor?: PrivacyContributorKey;
};

export type SetCookieDetail = {
  raw: string;
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  path: string | null;
  maxAge: string | null;
};

export type PrivacyPageProbe = {
  url: string;
  status: number | null;
  https: boolean;
  htmlLength: number;
  title: string | null;
  hasPrivacyLink: boolean;
  hasCookiePolicyLink: boolean;
  hasTermsLink: boolean;
  cmpHeuristics: string[];
  analyticsScriptHosts: string[];
  thirdPartyScriptHosts: string[];
  consentStorageHints: string[];
  setCookies: SetCookieDetail[];
  responseHeaders: Record<string, string>;
};

export type PrivacyEvidence = {
  origin: string;
  homepage: PrivacyPageProbe | null;
  privacyPage: PrivacyPageProbe | null;
  cookiePage: PrivacyPageProbe | null;
  headerSamples: {
    url: string;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    setCookies: SetCookieDetail[];
  }[];
};

export type PrivacyResult = {
  score: number | null;
  status: PrivacyStatus | null;
  contributors: PrivacyContributors;
  findings: PrivacyFinding[];
  unavailableReasons: Record<string, string>;
  executiveSummary: string;
  estimatedImprovement: string;
  trackingDetected: string[];
  complianceChecklist: { item: string; status: "pass" | "fail" | "unknown"; note: string }[];
  evidence?: PrivacyEvidence;
};

export type RunPrivacyAuditOptions = {
  workspaceId?: string;
  maxPages?: number;
};
