import {
  ctaButton,
  emailLayout,
  escapeHtml,
} from "@/lib/email/templates/layout";
import type { WelcomeEmailPayload } from "@/lib/email/sequences/welcome";

export function renderWelcomeDay2(payload: WelcomeEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Turn findings into Fix Paths™";
  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 10px;font-size:20px;">From gaps to fixes</h1>
    <p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Hi ${escapeHtml(payload.recipientName || "there")} — once a scan finishes, open the highest-impact
      Money Gaps™ and follow the Fix Path™ checklist (what to change, where, and how to verify).
    </p>
    <p class="mg-muted" style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Tip: start with crawlability and metadata gaps — they often unblock indexing and AI visibility first.
    </p>
    <p style="margin:20px 0 8px;">${ctaButton(payload.cta.dashboardHref, "Open Fix Paths")}</p>
    <p class="mg-muted" style="margin:20px 0 0;font-size:12px;line-height:1.45;color:#5a6b62;">
      Product update nurture (draft). Opt out anytime via
      <a href="${escapeHtml(payload.unsubscribeHref)}" style="color:#0f7a56;">unsubscribe</a>
      or
      <a href="${escapeHtml(payload.preferencesHref)}" style="color:#0f7a56;">preferences</a>.
    </p>
  `;
  const html = emailLayout({
    title: subject,
    preheader: "Use Fix Paths™ to close your highest-impact Money Gaps™.",
    bodyHtml,
    footerHtml: "MoneyGap AI · Welcome sequence · Day 2",
  });
  const text = [
    subject,
    "",
    `Hi ${payload.recipientName || "there"},`,
    "Open your highest-impact Money Gaps™ and follow each Fix Path™ checklist.",
    "",
    `Dashboard: ${payload.cta.dashboardHref}`,
    `Unsubscribe: ${payload.unsubscribeHref}`,
  ].join("\n");
  return { subject, html, text };
}
