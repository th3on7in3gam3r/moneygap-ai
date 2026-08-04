import type { EmailChannel } from "@/lib/email/types";
import { renderWelcomeDay0 } from "@/lib/email/templates/welcome-day0";
import { renderWelcomeDay2 } from "@/lib/email/templates/welcome-day2";
import { renderWelcomeDay7 } from "@/lib/email/templates/welcome-day7";
import { siteOrigin } from "@/lib/email/services/send";

export type WelcomeStepId = "day0" | "day2" | "day7";

export type WelcomeSequenceStep = {
  id: WelcomeStepId;
  templateKey: string;
  offsetDays: number;
  channel: EmailChannel;
  label: string;
};

/** Draft-only welcome / nurture catalog for moneygap-ai.com (v1 queues; no auto-send). */
export const WELCOME_SEQUENCE_STEPS: WelcomeSequenceStep[] = [
  {
    id: "day0",
    templateKey: "welcome.day0",
    offsetDays: 0,
    channel: "transactional",
    label: "Day 0 — Welcome",
  },
  {
    id: "day2",
    templateKey: "welcome.day2",
    offsetDays: 2,
    channel: "product_updates",
    label: "Day 2 — Fix Paths™",
  },
  {
    id: "day7",
    templateKey: "welcome.day7",
    offsetDays: 7,
    channel: "product_updates",
    label: "Day 7 — Growth Digest™",
  },
];

export type WelcomeEmailPayload = {
  recipientName: string;
  recipientEmail: string;
  websiteName: string | null;
  cta: {
    analyzeHref: string;
    dashboardHref: string;
    pricingHref: string;
  };
  unsubscribeHref: string;
  preferencesHref: string;
};

export function getWelcomeStep(stepId: WelcomeStepId): WelcomeSequenceStep | null {
  return WELCOME_SEQUENCE_STEPS.find((s) => s.id === stepId) ?? null;
}

export function buildWelcomePayload(input: {
  recipientName: string;
  recipientEmail: string;
  websiteName?: string | null;
  unsubscribeToken: string;
}): WelcomeEmailPayload {
  const origin = siteOrigin();
  return {
    recipientName: input.recipientName.trim() || "there",
    recipientEmail: input.recipientEmail,
    websiteName: input.websiteName ?? null,
    cta: {
      analyzeHref: `${origin}/dashboard/analyze`,
      dashboardHref: `${origin}/dashboard`,
      pricingHref: `${origin}/pricing`,
    },
    unsubscribeHref: `${origin}/api/email/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`,
    preferencesHref: `${origin}/dashboard/settings/email`,
  };
}

export function renderWelcomeStep(
  stepId: WelcomeStepId,
  payload: WelcomeEmailPayload,
): { subject: string; html: string; text: string } {
  switch (stepId) {
    case "day0":
      return renderWelcomeDay0(payload);
    case "day2":
      return renderWelcomeDay2(payload);
    case "day7":
      return renderWelcomeDay7(payload);
    default: {
      const _exhaustive: never = stepId;
      return _exhaustive;
    }
  }
}

export function isWelcomeLive(): boolean {
  return process.env.EMAIL_WELCOME_LIVE?.trim() === "1";
}
