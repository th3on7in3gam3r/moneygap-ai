import chalk from "chalk";
import {
  hasCriticalFailures,
  runLiveDiagnostics,
  type DiagnosticFinding,
  type DiagnosticStage,
} from "moneygap-diagnostics";
import { EXIT } from "../utils/constants.js";
import { requestCliVisualReport } from "../utils/cli-report.js";
import { askEmail, shouldSkipEmailPrompt } from "../utils/prompt.js";

function sevIcon(severity: DiagnosticFinding["severity"]): string {
  switch (severity) {
    case "pass":
      return chalk.green("✓");
    case "warn":
      return chalk.yellow("!");
    case "fail":
      return chalk.red("✗");
    default:
      return chalk.cyan("·");
  }
}

function printStage(stage: DiagnosticStage): void {
  if (stage.status === "running") {
    console.log(chalk.dim(`  › ${stage.label}…`));
  }
}

export async function runScanUrl(
  url: string,
  opts?: { skipPrompt?: boolean },
): Promise<number> {
  console.log();
  console.log(chalk.bold.green("MoneyGap Scan"));
  console.log(chalk.dim("Live diagnostics · crawlability · schema · performance signals"));
  console.log();
  console.log(`${chalk.dim("Target:")} ${url}`);
  console.log();

  const outcome = await runLiveDiagnostics(url, {
    onStage: printStage,
  });

  if (!outcome.ok && !outcome.result) {
    console.error(chalk.red(outcome.error));
    return EXIT.ERROR;
  }

  const result = outcome.result!;
  if (!outcome.ok) {
    console.error(chalk.red(outcome.error));
  }

  console.log();
  console.log(chalk.bold(`Score ${result.score} / 100`));
  if (result.meta.title) {
    console.log(chalk.dim(result.meta.title));
  }
  console.log(chalk.dim(`Finished in ${result.durationMs}ms`));
  console.log();

  for (const f of result.findings) {
    if (f.id === "perf.disclaimer") continue;
    console.log(`${sevIcon(f.severity)} ${chalk.bold(f.title)}`);
    console.log(`  ${chalk.dim(f.detail)}`);
  }

  console.log();
  console.log(chalk.dim("─".repeat(40)));
  console.log(
    chalk.dim(
      "These are free heuristics — not a full MoneyGap AI report with Fix Paths™.",
    ),
  );
  console.log(chalk.dim("Unlock Fix Paths: https://moneygap-ai.com"));
  console.log();

  const skipPrompt = opts?.skipPrompt || shouldSkipEmailPrompt();
  if (!skipPrompt) {
    try {
      const email = await askEmail(
        "Enter your email to get the full visual dashboard report (or press Enter to skip): ",
      );
      if (email) {
        console.log(chalk.dim("  Publishing Open Audit and sending link…"));
        const res = await requestCliVisualReport({ email, result });
        if (res.ok && res.href) {
          const absolute =
            res.href.startsWith("http")
              ? res.href
              : `https://www.moneygap-ai.com${res.href}`;
          console.log(`${chalk.green("✓")} Visual report: ${chalk.cyan(absolute)}`);
          if (res.emailed) {
            console.log(chalk.dim(`  Check ${email} for the link.`));
          } else {
            console.log(
              chalk.dim(
                "  Link ready (email delivery soft-failed — open the URL above).",
              ),
            );
          }
        } else {
          console.log(
            chalk.yellow(
              `  Could not publish report: ${res.error ?? "unknown error"}`,
            ),
          );
        }
        console.log();
      }
    } catch (err) {
      console.log(
        chalk.yellow(
          `  Skipped report email: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      console.log();
    }
  }

  if (!outcome.ok || hasCriticalFailures(result.findings)) {
    return EXIT.FINDINGS;
  }
  return EXIT.OK;
}
