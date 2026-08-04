import ora from "ora";
import chalk from "chalk";
import { loadConfig } from "../config/load.js";
import { runScan } from "../analyzers/run-scan.js";
import { printTerminalReport } from "../reporters/terminal.js";
import { exitCodeForScan } from "../utils/exit.js";
import { EXIT } from "../utils/constants.js";

export async function runScanCommand(projectRoot: string): Promise<number> {
  const spinner = ora("Scanning project…").start();
  try {
    const { config } = await loadConfig(projectRoot);
    const result = await runScan(projectRoot);
    spinner.succeed(chalk.green("Scan complete"));
    printTerminalReport(result);
    return exitCodeForScan(result, config.failOnSeverity);
  } catch (err) {
    spinner.fail(chalk.red("Scan failed"));
    console.error(err instanceof Error ? err.message : err);
    return EXIT.ERROR;
  }
}
