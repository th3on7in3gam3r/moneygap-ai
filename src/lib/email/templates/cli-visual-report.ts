import {
  ctaButton,
  emailLayout,
  escapeHtml,
} from "@/lib/email/templates/layout";
import { siteOrigin } from "@/lib/email/services/send";

export function renderCliVisualReport(input: {
  email: string;
  hostname: string;
  score: number;
  auditPath: string;
  pdfPath: string;
}): { subject: string; html: string; text: string } {
  const origin = siteOrigin();
  const withOrigin = (path: string) =>
    `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const reportUrl = withOrigin(input.auditPath);
  const pdfUrl = withOrigin(input.pdfPath);
  const trialUrl = `${origin}/pricing`;
  const subject = `Your MoneyGap scan for ${input.hostname}: ${input.score}/100`;

  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 10px;font-size:20px;">Your visual dashboard PDF is ready</h1>
    <p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Live diagnostics for <strong class="mg-fg">${escapeHtml(input.hostname)}</strong> scored
      <strong class="mg-fg">${input.score}/100</strong>. Download the PDF report (also attached)
      or view the Open Audit online.
    </p>
    <p style="margin:20px 0 8px;">${ctaButton(pdfUrl, "Download PDF")}</p>
    <p style="margin:8px 0 0;">${ctaButton(reportUrl, "View online")}</p>
    <p class="mg-muted" style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#5a6b62;">
      These are free heuristics — not a full MoneyGap Engine™ report with Fix Paths™.
      Start a free trial to unlock deeper growth intelligence.
    </p>
    <p style="margin:16px 0 0;">${ctaButton(trialUrl, "Start Free Trial")}</p>
    <p class="mg-muted" style="margin:20px 0 0;font-size:12px;line-height:1.45;color:#5a6b62;">
      Sent to ${escapeHtml(input.email)}. AI Estimate / heuristic scan — not legal, financial, or
      compliance advice.
    </p>
  `;

  const html = emailLayout({
    title: subject,
    preheader: `${input.hostname} scored ${input.score}/100 — download your PDF report`,
    bodyHtml,
    footerHtml: "MoneyGap AI · CLI visual report · Open Audits",
  });

  const text = [
    `Your MoneyGap scan for ${input.hostname}: ${input.score}/100`,
    "",
    `Download PDF: ${pdfUrl}`,
    `View online: ${reportUrl}`,
    `Start Free Trial: ${trialUrl}`,
    "",
    "A PDF copy is attached when email delivery succeeds.",
    "These are free heuristics — not a full MoneyGap Engine™ report with Fix Paths™.",
    "AI Estimate / heuristic scan — not legal, financial, or compliance advice.",
  ].join("\n");

  return { subject, html, text };
}
