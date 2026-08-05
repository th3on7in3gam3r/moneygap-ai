import type { ValidatedUrl } from "@/lib/analysis/url-normalize";

export type StageStatus = "success" | "fail" | "skip" | "warn";

export type ConnectivityErrorCode =
  | "invalid"
  | "dns"
  | "tcp"
  | "tls"
  | "timeout"
  | "unreachable"
  | "http"
  | "auth"
  | "waf";

export type ConnectivityStageId =
  | "url"
  | "dns"
  | "tcp"
  | "tls"
  | "homepage"
  | "redirect"
  | "waf"
  | "robots"
  | "sitemap"
  | "framework";

export type ConnectivityStageRecord = {
  id: ConnectivityStageId;
  status: StageStatus;
  detail: string;
  elapsedMs: number;
};

export type ConnectivityFetchRecord = {
  url: string;
  method: string;
  status: number | null;
  redirectCount: number;
  elapsedMs: number;
  timeoutReason?: string;
  error?: string;
  stack?: string;
};

export type ConnectivityDiagnostics = {
  url: string;
  finalUrl: string | null;
  dns: string;
  tcp: string;
  tls: string;
  redirect: string | null;
  homepage: string;
  robots: string;
  sitemap: string;
  cloudflareOrWaf: boolean;
  detectedFramework: string | null;
  estimatedPages: number | null;
  homepageLinkCount?: number;
  sitemapUrlCount?: number;
  warnings: string[];
  errors: string[];
  summary: string;
  technical: {
    stages: ConnectivityStageRecord[];
    fetches: ConnectivityFetchRecord[];
  };
  ok: boolean;
  code?: ConnectivityErrorCode;
  value?: ValidatedUrl;
};
