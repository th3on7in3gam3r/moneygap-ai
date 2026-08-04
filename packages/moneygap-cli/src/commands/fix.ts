import path from "node:path";
import chalk from "chalk";
import { loadLastScan, runScan } from "../analyzers/run-scan.js";
import { ensureDir, moneygapDir, writeText } from "../utils/fs.js";
import { EXIT } from "../utils/constants.js";

export async function runFix(
  projectRoot: string,
  opts: { apply?: boolean; yes?: boolean } = {},
): Promise<number> {
  try {
    if (opts.apply && !opts.yes) {
      console.error(
        chalk.red(
          "Refusing --apply without --yes. v1 never overwrites source files; use without --apply to write suggestion markdown.",
        ),
      );
      return EXIT.ERROR;
    }

    if (opts.apply && opts.yes) {
      console.log(
        chalk.yellow(
          "Auto-apply is not available in v1. Writing suggestion files only.",
        ),
      );
    }

    let result = await loadLastScan(projectRoot);
    if (!result) {
      console.log(chalk.dim("No last scan — running scan…"));
      result = await runScan(projectRoot);
    }

    const outDir = path.join(moneygapDir(projectRoot), "fixes");
    await ensureDir(outDir);

    const lines = [
      `# MoneyGap Fix Path™ suggestions`,
      ``,
      `Generated: ${new Date().toISOString()}`,
      `Project: ${result.projectName}`,
      `Score: ${result.overallScore}/100`,
      ``,
      `These are recommendations only — MoneyGap CLI v1 does not patch source files.`,
      ``,
    ];

    for (const f of result.findings) {
      lines.push(`## ${f.title}`);
      lines.push(``);
      lines.push(`- Rule: \`${f.ruleId}\``);
      lines.push(`- Severity: ${f.severity}`);
      if (f.file) lines.push(`- File: \`${f.file}\``);
      lines.push(``);
      lines.push(f.explanation);
      lines.push(``);
      lines.push(`**Do this:** ${f.recommendation}`);
      lines.push(``);
      lines.push(`Impact: ${f.estimatedImpact}`);
      lines.push(``);
    }

    const file = path.join(outDir, `suggestions-${Date.now()}.md`);
    await writeText(file, lines.join("\n"));
    await writeText(path.join(outDir, "latest.md"), lines.join("\n"));

    console.log();
    console.log(chalk.bold("Top recommendations"));
    console.log();
    for (const f of result.findings.slice(0, 8)) {
      console.log(`${chalk.cyan("→")} ${f.title}`);
      console.log(`  ${chalk.dim(f.recommendation)}`);
    }
    console.log();
    console.log(chalk.green(`Wrote ${file}`));
    console.log();
    return EXIT.OK;
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    return EXIT.ERROR;
  }
}
