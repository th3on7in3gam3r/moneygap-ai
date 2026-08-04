import chalk from "chalk";
import { runScan, loadLastScan } from "../analyzers/run-scan.js";
import {
  writeHtmlReport,
  writeJsonReport,
  writeMarkdownReport,
  writePdfReport,
} from "../reporters/files.js";
import { EXIT } from "../utils/constants.js";

export async function runReport(
  projectRoot: string,
  opts: { format?: string; rescan?: boolean } = {},
): Promise<number> {
  try {
    let result = opts.rescan ? null : await loadLastScan(projectRoot);
    if (!result) {
      console.log(chalk.dim("No last scan found — running scan…"));
      result = await runScan(projectRoot);
    }

    const formats = (opts.format ?? "json,md,html")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const written: string[] = [];
    for (const f of formats) {
      if (f === "json") written.push(await writeJsonReport(projectRoot, result));
      else if (f === "md" || f === "markdown")
        written.push(await writeMarkdownReport(projectRoot, result));
      else if (f === "html")
        written.push(await writeHtmlReport(projectRoot, result));
      else if (f === "pdf") {
        await writePdfReport();
      } else {
        console.error(chalk.yellow(`Unknown format: ${f}`));
      }
    }

    console.log();
    console.log(chalk.bold("Reports written:"));
    for (const w of written) console.log(chalk.cyan(`  ${w}`));
    console.log();
    return EXIT.OK;
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    return EXIT.ERROR;
  }
}
