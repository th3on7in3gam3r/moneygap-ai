import chalk from "chalk";
import { CLI_VERSION } from "../utils/constants.js";

export async function runVersion(): Promise<void> {
  console.log(`@moneygap/cli ${CLI_VERSION}`);
  console.log(chalk.dim(`Node ${process.version}`));
}
