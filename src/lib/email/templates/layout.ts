const ACCENT = "#0f7a56";
const BG = "#f4f6f4";
const FG = "#121816";
const MUTED = "#5a6b62";

export function emailLayout(input: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .mg-bg { background: #0a0e0c !important; }
      .mg-card { background: #121916 !important; border-color: #24302a !important; }
      .mg-fg { color: #eef3f0 !important; }
      .mg-muted { color: #9aaca2 !important; }
    }
    @media only screen and (max-width: 620px) {
      .mg-pad { padding: 20px 16px !important; }
    }
  </style>
</head>
<body class="mg-bg" style="margin:0;padding:0;background:${BG};font-family:DM Sans,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${FG};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="mg-bg" style="background:${BG};">
    <tr>
      <td align="center" class="mg-pad" style="padding:32px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};">MoneyGap AI</p>
            </td>
          </tr>
          <tr>
            <td class="mg-card mg-fg" style="background:#ffffff;border:1px solid #d5ddd8;border-radius:16px;padding:28px 24px;color:${FG};">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="mg-muted" style="padding-top:20px;font-size:12px;line-height:1.5;color:${MUTED};">
              ${input.footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bulletList(items: string[]): string {
  if (items.length === 0) {
    return `<p class="mg-muted" style="margin:0;color:${MUTED};font-size:14px;">None this period.</p>`;
  }
  return `<ul style="margin:8px 0 0;padding-left:18px;">${items
    .map(
      (i) =>
        `<li style="margin:0 0 6px;font-size:14px;line-height:1.45;">${escapeHtml(i)}</li>`,
    )
    .join("")}</ul>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${ACCENT};color:#f3fff9;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:12px;">${escapeHtml(label)}</a>`;
}
