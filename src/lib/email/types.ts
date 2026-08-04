export const EMAIL_CHANNELS = [
  "weekly_growth_digest",
  "ai_readiness_updates",
  "developer_tips",
  "product_updates",
  "security_notifications",
  "monthly_product_summary",
  "transactional",
] as const;

export type EmailChannel = (typeof EMAIL_CHANNELS)[number];

export const DIGEST_FREQUENCIES = ["weekly", "biweekly", "monthly", "off"] as const;
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

export const DELIVERY_STATUSES = [
  "queued",
  "sent",
  "failed",
  "bounced",
  "complained",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const EMAIL_EVENT_TYPES = [
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "unsubscribed",
  "complained",
] as const;
export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html?: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
};

export type EmailSendResult = {
  ok: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
};

export type GrowthDigestPayload = {
  recipientName: string;
  recipientEmail: string;
  score: number | null;
  scoreDelta: number | null;
  websiteName: string | null;
  websiteUrl: string | null;
  improvements: string[];
  newIssues: string[];
  topRecommendation: string | null;
  frameworkTip: string | null;
  docsArticle: { title: string; href: string } | null;
  productUpdate: string;
  reportId: string | null;
  cta: {
    analyzeHref: string;
    dashboardHref: string;
    reportHref: string | null;
  };
  unsubscribeHref: string;
  preferencesHref: string;
};
