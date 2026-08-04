import chalk from "chalk";
import type { Category, ScanResult, Severity } from "../types/index.js";

const CATEGORY_LABEL: Record<Category, string> = {
  seo: "SEO",
  aeo: "AI Visibility",
  performance: "Performance",
  accessibility: "Accessibility",
  trust: "Trust",
  growth: "Revenue",
  aiReadiness: "AI Readiness",
};

function bar(score: number, width = 16): string {
  const filled = Math.round((score / 100) * width);
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(width - filled));
}

function padLabel(label: string, len = 18): string {
  return label.padEnd(len, ".");
}

const SEV_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function printTerminalReport(result: ScanResult): void {
  const line = chalk.dim("─".repeat(36));
  const fw = result.framework.version
    ? `${result.framework.name} ${result.framework.version}`
    : result.framework.name;

  console.log();
  console.log(line);
  console.log();
  console.log(chalk.bold.green("MoneyGap CLI"));
  console.log();
  console.log(`${chalk.dim("Project:")}`);
  console.log(result.projectName);
  console.log();
  console.log(`${chalk.dim("Framework:")}`);
  console.log(fw);
  console.log();
  console.log(line);
  console.log();
  console.log(chalk.bold("Overall Score"));
  console.log();
  console.log(chalk.bold.white(`${result.overallScore} / 100`));
  console.log();
  console.log(chalk.dim(result.executiveSummary));
  console.log();

  (Object.keys(CATEGORY_LABEL) as Category[]).forEach((cat) => {
    const score = result.categoryScores[cat];
    console.log(
      `${padLabel(CATEGORY_LABEL[cat])} ${String(score).padStart(3)}  ${bar(score)}`,
    );
  });

  console.log();
  console.log(line);
  console.log();
  console.log(chalk.bold("Top Opportunities"));
  console.log();

  const top = [...result.findings]
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
    .slice(0, 6);

  if (top.length === 0) {
    console.log(chalk.green("No major opportunities — nice work."));
  } else {
    for (const f of top) {
      console.log(`${chalk.red("🔥")} ${f.title}`);
    }
  }

  console.log();
  console.log(line);
  console.log();
  console.log(`${chalk.dim("Run:")}`);
  console.log(chalk.cyan("moneygap report"));
  console.log();
  console.log(`${chalk.dim("for full details.")}`);
  console.log();
  console.log(
    chalk.dim(
      `Scanned in ${result.durationMs}ms · ${result.findings.length} findings`,
    ),
  );
  console.log();
}
