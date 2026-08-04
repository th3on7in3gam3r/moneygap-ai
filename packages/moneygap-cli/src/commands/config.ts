import chalk from "chalk";
import { loadConfig, moneyGapConfigSchema } from "../config/load.js";
import { EXIT } from "../utils/constants.js";

export async function runConfig(
  projectRoot: string,
  opts: { validate?: boolean; pathOnly?: boolean } = {},
): Promise<number> {
  try {
    const { config, path: cfgPath } = await loadConfig(projectRoot);

    if (opts.pathOnly) {
      console.log(cfgPath ?? "(using built-in defaults)");
      return EXIT.OK;
    }

    if (opts.validate) {
      const parsed = moneyGapConfigSchema.safeParse(config);
      if (!parsed.success) {
        console.error(chalk.red(parsed.error.message));
        return EXIT.ERROR;
      }
      console.log(chalk.green("Config is valid."));
      console.log(cfgPath ?? "(defaults)");
      return EXIT.OK;
    }

    console.log();
    console.log(chalk.bold("Resolved MoneyGap config"));
    console.log(chalk.dim(cfgPath ?? "defaults (no moneygap.config.* found)"));
    console.log();
    console.log(JSON.stringify(config, null, 2));
    console.log();
    return EXIT.OK;
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    return EXIT.ERROR;
  }
}
