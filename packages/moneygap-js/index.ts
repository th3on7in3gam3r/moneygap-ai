/**
 * MoneyGap JavaScript SDK (thin REST client)
 * Wraps MoneyGap API™ `/api/v1` — see /docs/moneygap-api and /openapi/moneygap-v1.json
 */

export type MoneyGapClientOptions = {
  baseUrl: string;
  apiKey: string;
};

export type AnalyzeOptions = {
  industry?: string;
  business_type?: string;
  target_audience?: string;
};

export class MoneyGapClient {
  constructor(private opts: MoneyGapClientOptions) {}

  private async request(path: string, init?: RequestInit) {
    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.opts.apiKey}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (body as { error?: string }).error ?? `HTTP ${res.status}`,
      );
    }
    return body;
  }

  analyze(websiteUrl: string, options?: AnalyzeOptions) {
    return this.request("/api/v1/analyze", {
      method: "POST",
      body: JSON.stringify({
        website_url: websiteUrl,
        ...(options?.industry ? { industry: options.industry } : {}),
        ...(options?.business_type
          ? { business_type: options.business_type }
          : {}),
        ...(options?.target_audience
          ? { target_audience: options.target_audience }
          : {}),
      }),
    });
  }

  getAnalysisStatus(id: string) {
    return this.request(`/api/v1/analyze/${encodeURIComponent(id)}/status`);
  }

  getReport(id: string) {
    return this.request(`/api/v1/reports/${encodeURIComponent(id)}`);
  }

  getWebsiteScore(id: string) {
    return this.request(`/api/v1/websites/${encodeURIComponent(id)}/score`);
  }

  getWebsiteOpportunities(id: string) {
    return this.request(
      `/api/v1/websites/${encodeURIComponent(id)}/opportunities`,
    );
  }
}

export const MARKETPLACE_EVENTS = [
  "listing.installed",
  "listing.uninstalled",
  "review.created",
  "academy.lesson_completed",
  "creator.revenue_attributed",
] as const;

export default MoneyGapClient;
