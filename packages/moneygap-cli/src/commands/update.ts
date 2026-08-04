import chalk from "chalk";
import { CLI_VERSION, EXIT } from "../utils/constants.js";

export async function runUpdate(): Promise<number> {
  console.log();
  console.log(chalk.bold("moneygap update"));
  console.log();
  console.log(`Current version: ${CLI_VERSION}`);

  try {
    const res = await fetch("https://registry.npmjs.org/moneygap-scan/latest", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.log(
        chalk.yellow(
          "Could not reach npm registry (package may not be published yet).",
        ),
      );
      return EXIT.OK;
    }
    const data = (await res.json()) as { version?: string };
    const latest = data.version ?? "unknown";
    console.log(`Latest on npm: ${latest}`);
    if (latest === CLI_VERSION) {
      console.log(chalk.green("You are up to date."));
    } else {
      console.log(
        chalk.cyan(`Update with: npm install -g moneygap-scan@${latest}`),
      );
    }
  } catch {
    console.log(
      chalk.yellow(
        "Offline or registry unreachable — soft-fail. Local CLI still works.",
      ),
    );
  }
  console.log();
  return EXIT.OK;
}
