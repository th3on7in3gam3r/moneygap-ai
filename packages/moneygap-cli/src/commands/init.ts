import path from "node:path";
import chalk from "chalk";
import { defaultConfigSource } from "../config/load.js";
import { pathExists, writeText } from "../utils/fs.js";

export async function runInit(
  projectRoot: string,
  opts: { force?: boolean; name?: string } = {},
): Promise<void> {
  const configPath = path.join(projectRoot, "moneygap.config.ts");
  const ignorePath = path.join(projectRoot, ".moneygapignore");

  if ((await pathExists(configPath)) && !opts.force) {
    console.log(chalk.yellow("moneygap.config.ts already exists. Use --force to overwrite."));
  } else {
    await writeText(configPath, defaultConfigSource(opts.name));
    console.log(chalk.green(`Wrote ${configPath}`));
  }

  if ((await pathExists(ignorePath)) && !opts.force) {
    console.log(chalk.yellow(".moneygapignore already exists."));
  } else {
    await writeText(
      ignorePath,
      [
        "node_modules/",
        ".git/",
        "dist/",
        ".next/",
        "coverage/",
        ".moneygap/",
        "",
      ].join("\n"),
    );
    console.log(chalk.green(`Wrote ${ignorePath}`));
  }

  console.log();
  console.log(chalk.dim("Next: moneygap scan"));
}
