import { emailLayout, escapeHtml } from "@/lib/email/templates/layout";

export function renderCliWaitlistConfirm(email: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "You’re on the MoneyGap CLI CI/CD waitlist";
  const bodyHtml = `
    <h1 class="mg-fg" style="margin:0 0 10px;font-size:20px;">Thanks for joining</h1>
    <p class="mg-muted" style="margin:0;font-size:14px;line-height:1.5;color:#5a6b62;">
      We’ll notify <strong class="mg-fg">${escapeHtml(email)}</strong> when automated MoneyGap CLI
      scans land in CI/CD pipelines — with developer-first fix checklists, not generic marketing.
    </p>
    <p class="mg-muted" style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5a6b62;">
      Meanwhile try <code style="background:#e8ece9;padding:2px 6px;border-radius:6px;">npx moneygap-scan &lt;url&gt;</code>
      or the free homepage sandbox.
    </p>
  `;
  const html = emailLayout({
    title: subject,
    bodyHtml,
    footerHtml: "MoneyGap AI · CLI waitlist confirmation",
  });
  const text = [
    "Thanks for joining the MoneyGap CLI CI/CD waitlist.",
    `We'll email ${email} when pipeline scans ship.`,
    "Try: npx moneygap-scan <url>",
  ].join("\n");
  return { subject, html, text };
}
