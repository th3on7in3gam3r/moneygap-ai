import chalk from "chalk";

export async function runAuth(): Promise<void> {
  console.log();
  console.log(chalk.bold("moneygap auth"));
  console.log();
  console.log(
    "Cloud login is planned for a future release. Local scans work fully offline — no account required.",
  );
  console.log();
  console.log(chalk.dim("Future flow (not implemented):"));
  console.log(chalk.dim("  1. moneygap auth login"));
  console.log(chalk.dim("  2. Browser OAuth / device code"));
  console.log(chalk.dim("  3. Token stored under ~/.moneygap/credentials"));
  console.log(chalk.dim("  4. moneygap upload / dashboard / sync"));
  console.log();
  console.log("Nothing was stored.");
  console.log();
}
