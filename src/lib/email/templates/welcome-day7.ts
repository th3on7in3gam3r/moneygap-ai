import {
  ctaButton,
  emailLayout,
  escapeHtml,
} from "@/lib/email/templates/layout";
import type { WelcomeEmailPayload } from "@/lib/email/sequences/welcome";

export function renderWelcomeDay7(payload: WelcomeEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Keep closing gaps with Growth Digest™";
  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 10px;font-size:20px;">Stay on top of new gaps</h1>
    <p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Hi ${escapeHtml(payload.recipientName || "there")} — Growth Digest™ emails your MoneyGap Score™,
      new issues, and top Fix Path™ priorities on a schedule you control.
    </p>
    <p class="mg-muted" style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Teams that keep scanning and closing gaps tend to convert trials into paid plans more often —
      that lift is an <strong class="mg-fg">AI Estimate</strong> (Opportunity Index™ framing for this
      nurture gap cited ~$50,000 annual impact — <em>not a guarantee</em>).
    </p>
    <p style="margin:20px 0 8px;">${ctaButton(payload.cta.pricingHref, "View plans")}</p>
    <p style="margin:8px 0 0;">${ctaButton(payload.preferencesHref, "Digest preferences")}</p>
    <p class="mg-muted" style="margin:20px 0 0;font-size:12px;line-height:1.45;color:#5a6b62;">
      Product update nurture (draft).
      <a href="${escapeHtml(payload.unsubscribeHref)}" style="color:#0f7a56;">Unsubscribe</a>
    </p>
  `;
  const html = emailLayout({
    title: subject,
    preheader: "Growth Digest™ keeps Fix Paths™ flowing — AI Estimates are not guarantees.",
    bodyHtml,
    footerHtml: "MoneyGap AI · Welcome sequence · Day 7 · AI Estimate disclaimer",
  });
  const text = [
    subject,
    "",
    `Hi ${payload.recipientName || "there"},`,
    "Enable Growth Digest™ for ongoing score + Fix Path™ priorities.",
    "Trial-to-paid lift cited for this nurture gap is an AI Estimate (~$50,000 annual) — not a guarantee.",
    "",
    `Plans: ${payload.cta.pricingHref}`,
    `Preferences: ${payload.preferencesHref}`,
    `Unsubscribe: ${payload.unsubscribeHref}`,
  ].join("\n");
  return { subject, html, text };
}
