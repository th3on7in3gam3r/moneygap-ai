import chalk from "chalk";
import { loadConfig } from "../config/load.js";
import { detectFramework } from "../frameworks/detect.js";
import { loadPlugins } from "../plugins/api.js";
import { CLI_VERSION } from "../utils/constants.js";

export async function runDoctor(projectRoot: string): Promise<void> {
  console.log();
  console.log(chalk.bold("MoneyGap doctor"));
  console.log();

  const node = process.versions.node;
  const major = Number(node.split(".")[0]);
  const nodeOk = major >= 22;
  console.log(
    `${nodeOk ? chalk.green("✓") : chalk.red("✗")} Node.js ${node} ${nodeOk ? "(ok)" : "(need >=22)"}`,
  );
  console.log(`${chalk.green("✓")} CLI version ${CLI_VERSION}`);

  try {
    const { config, path: cfgPath } = await loadConfig(projectRoot);
    console.log(
      `${chalk.green("✓")} Config ${cfgPath ? cfgPath : "(defaults)"} — ${config.ignore.length} ignore patterns`,
    );
  } catch (err) {
    console.log(
      `${chalk.red("✗")} Config invalid: ${err instanceof Error ? err.message : err}`,
    );
  }

  const fw = await detectFramework(projectRoot);
  console.log(
    `${chalk.green("✓")} Framework: ${fw.name}${fw.version ? ` ${fw.version}` : ""} (${fw.id})`,
  );

  const plugins = await loadPlugins();
  console.log(
    `${chalk.green("✓")} Plugins: ${plugins.length === 0 ? "none loaded (v1 default)" : plugins.join(", ")}`,
  );

  console.log();
  console.log(chalk.dim("Cloud auth / AI providers are optional and unused by offline scan."));
  console.log();
}
