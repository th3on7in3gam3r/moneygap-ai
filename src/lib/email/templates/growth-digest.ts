import {
  bulletList,
  ctaButton,
  emailLayout,
  escapeHtml,
} from "@/lib/email/templates/layout";
import type { GrowthDigestPayload } from "@/lib/email/types";

export function renderGrowthDigest(payload: GrowthDigestPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const scoreLabel =
    payload.score == null ? "No score yet" : `${payload.score} / 100`;
  const deltaLabel =
    payload.scoreDelta == null
      ? ""
      : payload.scoreDelta === 0
        ? " (unchanged)"
        : payload.scoreDelta > 0
          ? ` (+${payload.scoreDelta} since last report)`
          : ` (${payload.scoreDelta} since last report)`;

  const subjectSite = payload.websiteName ?? "your site";
  const subject = `Growth Digest™ — ${subjectSite} · ${scoreLabel}`;

  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 8px;font-size:22px;line-height:1.25;">Hi ${escapeHtml(payload.recipientName)},</h1>
    <p class="mg-muted" style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#5a6b62;">
      Your MoneyGap Growth Digest™${payload.websiteName ? ` for <strong class="mg-fg">${escapeHtml(payload.websiteName)}</strong>` : ""}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f4f6f4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#0f7a56;font-weight:700;">MoneyGap Score™</p>
          <p class="mg-fg" style="margin:6px 0 0;font-size:28px;font-weight:700;">${escapeHtml(scoreLabel)}<span style="font-size:14px;font-weight:500;color:#5a6b62;">${escapeHtml(deltaLabel)}</span></p>
        </td>
      </tr>
    </table>
    <h2 class="mg-fg" style="margin:0 0 6px;font-size:16px;">Top improvements</h2>
    ${bulletList(payload.improvements)}
    <h2 class="mg-fg" style="margin:18px 0 6px;font-size:16px;">New issues detected</h2>
    ${bulletList(payload.newIssues)}
    <h2 class="mg-fg" style="margin:18px 0 6px;font-size:16px;">Highest-priority recommendation</h2>
    <p class="mg-fg" style="margin:0;font-size:14px;line-height:1.5;">${escapeHtml(payload.topRecommendation ?? "Keep scanning and closing gaps.")}</p>
    ${
      payload.frameworkTip
        ? `<h2 class="mg-fg" style="margin:18px 0 6px;font-size:16px;">Framework tip</h2><p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">${escapeHtml(payload.frameworkTip)}</p>`
        : ""
    }
    ${
      payload.docsArticle
        ? `<h2 class="mg-fg" style="margin:18px 0 6px;font-size:16px;">From the docs</h2><p style="margin:0;font-size:14px;"><a href="${escapeHtml(payload.docsArticle.href)}" style="color:#0f7a56;font-weight:600;">${escapeHtml(payload.docsArticle.title)}</a></p>`
        : ""
    }
    <h2 class="mg-fg" style="margin:18px 0 6px;font-size:16px;">Product update</h2>
    <p class="mg-muted" style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#5a6b62;">${escapeHtml(payload.productUpdate)}</p>
    <div style="margin-top:8px;">
      ${ctaButton(payload.cta.analyzeHref, "Run another scan")}
      &nbsp;&nbsp;
      ${ctaButton(payload.cta.dashboardHref, "Visit dashboard")}
      ${
        payload.cta.reportHref
          ? `&nbsp;&nbsp;${ctaButton(payload.cta.reportHref, "Open latest report")}`
          : ""
      }
    </div>
  `;

  const footerHtml = `
    You’re receiving MoneyGap Growth Digest™ based on your email preferences.
    <a href="${escapeHtml(payload.preferencesHref)}" style="color:#0f7a56;">Manage preferences</a>
    ·
    <a href="${escapeHtml(payload.unsubscribeHref)}" style="color:#0f7a56;">Unsubscribe</a>
  `;

  const html = emailLayout({
    title: subject,
    preheader: `Score ${scoreLabel}${deltaLabel}. ${payload.topRecommendation ?? ""}`.slice(
      0,
      140,
    ),
    bodyHtml,
    footerHtml,
  });

  const text = [
    `Hi ${payload.recipientName},`,
    "",
    `MoneyGap Score™: ${scoreLabel}${deltaLabel}`,
    payload.websiteName ? `Site: ${payload.websiteName}` : "",
    "",
    "Top improvements:",
    ...(payload.improvements.length
      ? payload.improvements.map((i) => `• ${i}`)
      : ["• None this period"]),
    "",
    "New issues:",
    ...(payload.newIssues.length
      ? payload.newIssues.map((i) => `• ${i}`)
      : ["• None this period"]),
    "",
    `Priority: ${payload.topRecommendation ?? ""}`,
    payload.frameworkTip ? `Framework tip: ${payload.frameworkTip}` : "",
    payload.docsArticle
      ? `Docs: ${payload.docsArticle.title} — ${payload.docsArticle.href}`
      : "",
    "",
    `Product update: ${payload.productUpdate}`,
    "",
    `Run another scan: ${payload.cta.analyzeHref}`,
    `Dashboard: ${payload.cta.dashboardHref}`,
    payload.cta.reportHref ? `Latest report: ${payload.cta.reportHref}` : "",
    "",
    `Preferences: ${payload.preferencesHref}`,
    `Unsubscribe: ${payload.unsubscribeHref}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
