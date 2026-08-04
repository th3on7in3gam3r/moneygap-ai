import path from "node:path";
import type { ScanResult } from "../types/index.js";
import { ensureDir, writeText } from "../utils/fs.js";
import { moneygapDir } from "../utils/fs.js";

export async function writeJsonReport(
  projectRoot: string,
  result: ScanResult,
): Promise<string> {
  const dir = path.join(moneygapDir(projectRoot), "reports");
  await ensureDir(dir);
  const file = path.join(dir, `scan-${Date.now()}.json`);
  await writeText(file, JSON.stringify(result, null, 2));
  await writeText(
    path.join(dir, "latest.json"),
    JSON.stringify(result, null, 2),
  );
  return file;
}

export async function writeMarkdownReport(
  projectRoot: string,
  result: ScanResult,
): Promise<string> {
  const dir = path.join(moneygapDir(projectRoot), "reports");
  await ensureDir(dir);
  const lines = [
    `# MoneyGap CLI Report`,
    ``,
    `**Project:** ${result.projectName}  `,
    `**Framework:** ${result.framework.name}${result.framework.version ? ` ${result.framework.version}` : ""}  `,
    `**Scanned:** ${result.scannedAt}  `,
    `**Overall MoneyGap Score™:** ${result.overallScore}/100`,
    ``,
    result.executiveSummary,
    ``,
    `## Category scores`,
    ``,
    `| Category | Score |`,
    `| --- | ---: |`,
    `| SEO | ${result.categoryScores.seo} |`,
    `| AI Visibility | ${result.categoryScores.aeo} |`,
    `| Performance | ${result.categoryScores.performance} |`,
    `| Accessibility | ${result.categoryScores.accessibility} |`,
    `| Trust | ${result.categoryScores.trust} |`,
    `| Revenue Readiness | ${result.categoryScores.growth} |`,
    ``,
    `## Findings`,
    ``,
  ];
  for (const f of result.findings) {
    lines.push(`### ${f.title}`);
    lines.push(``);
    lines.push(`- **Severity:** ${f.severity}`);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Impact:** ${f.estimatedImpact}`);
    if (f.file) lines.push(`- **File:** \`${f.file}\``);
    lines.push(``);
    lines.push(f.explanation);
    lines.push(``);
    lines.push(`**Recommendation:** ${f.recommendation}`);
    lines.push(``);
    lines.push(`[Docs](${f.docsUrl})`);
    lines.push(``);
  }
  const file = path.join(dir, `scan-${Date.now()}.md`);
  await writeText(file, lines.join("\n"));
  await writeText(path.join(dir, "latest.md"), lines.join("\n"));
  return file;
}

export async function writeHtmlReport(
  projectRoot: string,
  result: ScanResult,
): Promise<string> {
  const dir = path.join(moneygapDir(projectRoot), "reports");
  await ensureDir(dir);
  const rows = result.findings
    .map(
      (f) =>
        `<tr><td>${escape(f.title)}</td><td>${f.severity}</td><td>${f.category}</td><td>${escape(f.recommendation)}</td></tr>`,
    )
    .join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MoneyGap CLI Report — ${escape(result.projectName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #0c1210; background: #f4f7f5; }
    h1 { font-size: 1.75rem; }
    .score { font-size: 2.5rem; font-weight: 700; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #c5d0c9; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
    th { background: #e8eee9; }
  </style>
</head>
<body>
  <h1>MoneyGap CLI Report</h1>
  <p><strong>${escape(result.projectName)}</strong> · ${escape(result.framework.name)}</p>
  <p class="score">${result.overallScore} / 100</p>
  <p>${escape(result.executiveSummary)}</p>
  <h2>Findings</h2>
  <table>
    <thead><tr><th>Title</th><th>Severity</th><th>Category</th><th>Fix</th></tr></thead>
    <tbody>
      ${rows || "<tr><td colspan=4>No findings</td></tr>"}
    </tbody>
  </table>
  <p style="margin-top:2rem;color:#66776e;font-size:0.85rem">Observed scores · AI Estimates are not guarantees. PDF export is planned for a future release.</p>
</body>
</html>`;
  const file = path.join(dir, `scan-${Date.now()}.html`);
  await writeText(file, html);
  await writeText(path.join(dir, "latest.html"), html);
  return file;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** PDF stub — not in v1 */
export async function writePdfReport(): Promise<never> {
  throw new Error("PDF export is not available in MoneyGap CLI v1.");
}
