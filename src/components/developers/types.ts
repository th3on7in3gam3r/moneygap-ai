export type UsageSummary = {
  planId: string;
  planName: string;
  hasApiAccess: boolean;
  limits: { apiCallsPerMonth: number; analysesPerMonth: number };
  usage: {
    api_call: number;
    website_analysis: number;
    requestsThisMonth: number;
    errorsThisMonth: number;
  };
  keys: {
    id: string;
    name: string;
    keyPrefix: string;
    environment: string;
    scopes: string[];
    rateLimitPerMinute: number;
    lastUsedAt: string | null;
  }[];
  recentRequests: {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    errorCode: string | null;
    durationMs: number | null;
    createdAt: string;
  }[];
};

export type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  secretPreview?: string;
};

export type WebhookDeliveryRow = {
  id: string;
  endpointId: string;
  event: string;
  status: string;
  responseStatus: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type DevelopersTab =
  | "overview"
  | "keys"
  | "webhooks"
  | "logs"
  | "resources";

export const API_SCOPES = ["analyze", "read", "webhooks"] as const;
export type ApiScope = (typeof API_SCOPES)[number];
