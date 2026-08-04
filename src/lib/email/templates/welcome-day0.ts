import {
  ctaButton,
  emailLayout,
  escapeHtml,
} from "@/lib/email/templates/layout";
import type { WelcomeEmailPayload } from "@/lib/email/sequences/welcome";

export function renderWelcomeDay0(payload: WelcomeEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to MoneyGap AI${payload.recipientName ? `, ${payload.recipientName}` : ""}`;
  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 10px;font-size:20px;">Welcome aboard</h1>
    <p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Hi ${escapeHtml(payload.recipientName || "there")} — MoneyGap AI finds Money Gaps™ on
      ${payload.websiteName ? `<strong class="mg-fg">${escapeHtml(payload.websiteName)}</strong>` : "your site"}
      and turns them into Fix Paths™ you can ship.
    </p>
    <p class="mg-muted" style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Start with a free analysis, then unlock deeper growth intelligence during your trial.
    </p>
    <p style="margin:20px 0 8px;">${ctaButton(payload.cta.analyzeHref, "Run your first analysis")}</p>
    <p style="margin:8px 0 0;">${ctaButton(payload.cta.dashboardHref, "Open dashboard")}</p>
    <p class="mg-muted" style="margin:20px 0 0;font-size:12px;line-height:1.45;color:#5a6b62;">
      This is a transactional account welcome for moneygap-ai.com.
      <a href="${escapeHtml(payload.preferencesHref)}" style="color:#0f7a56;">Email preferences</a>
    </p>
  `;
  const html = emailLayout({
    title: subject,
    preheader: "Your MoneyGap workspace is ready — run your first analysis.",
    bodyHtml,
    footerHtml: "MoneyGap AI · Welcome · moneygap-ai.com",
  });
  const text = [
    subject,
    "",
    `Hi ${payload.recipientName || "there"},`,
    "Your MoneyGap workspace is ready. Run your first analysis to surface Money Gaps™ and Fix Paths™.",
    "",
    `Analyze: ${payload.cta.analyzeHref}`,
    `Dashboard: ${payload.cta.dashboardHref}`,
    `Preferences: ${payload.preferencesHref}`,
  ].join("\n");
  return { subject, html, text };
}
