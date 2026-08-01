/**
 * MoneyGap JavaScript SDK (thin stub)
 * Wraps MoneyGap API™ `/api/v1` — see docs/api-platform.md and docs/plugin-sdk.md
 */

export type MoneyGapClientOptions = {
  baseUrl: string;
  apiKey: string;
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

  analyze(url: string) {
    return this.request("/api/v1/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  getReport(id: string) {
    return this.request(`/api/v1/reports/${id}`);
  }

  getWebsiteScore(id: string) {
    return this.request(`/api/v1/websites/${id}/score`);
  }

  getWebsiteOpportunities(id: string) {
    return this.request(`/api/v1/websites/${id}/opportunities`);
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
