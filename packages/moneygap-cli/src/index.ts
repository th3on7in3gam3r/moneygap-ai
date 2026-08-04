#!/usr/bin/env node
import { Command } from "commander";
import { runAuth } from "./commands/auth.js";
import { runConfig } from "./commands/config.js";
import { runDoctor } from "./commands/doctor.js";
import { runFix } from "./commands/fix.js";
import { runGenerateLlms } from "./commands/generate-llms.js";
import { runInit } from "./commands/init.js";
import { runReport } from "./commands/report.js";
import { runScanCommand } from "./commands/scan.js";
import { runUpdate } from "./commands/update.js";
import { runValidateLlms } from "./commands/validate-llms.js";
import { runVersion } from "./commands/version.js";
import { CLI_VERSION, EXIT } from "./utils/constants.js";
import { resolveCwd } from "./utils/exit.js";

export type { MoneyGapConfig, Finding, ScanResult, Analyzer } from "./types/index.js";
export { registerAnalyzer, registerReporter } from "./plugins/api.js";
export { providers } from "./providers/ai.js";
export {
  generateLlmsFile,
  validateLlmsFile,
  calculateAIReadiness,
  detectKnowledgeResources,
} from "./ai-readiness/index.js";

const program = new Command();

program
  .name("moneygap")
  .description(
    "MoneyGap CLI — offline developer growth intelligence (SEO, AEO, a11y, trust, performance, revenue).",
  )
  .version(CLI_VERSION, "-V, --version")
  .option("--cwd <path>", "Project root (default: process.cwd())");

program
  .command("init")
  .description("Create moneygap.config.ts and .moneygapignore")
  .option("--force", "Overwrite existing files")
  .option("--name <name>", "Project name for config")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    await runInit(root, { force: opts.force, name: opts.name });
  });

program
  .command("scan")
  .description("Run offline analyzers and print MoneyGap Score™")
  .action(async (_opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    const code = await runScanCommand(root);
    process.exitCode = code;
  });

program
  .command("doctor")
  .description("Check Node, config, framework detection, plugins")
  .action(async (_opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    await runDoctor(root);
  });

program
  .command("report")
  .description("Write JSON / Markdown / HTML reports from last scan")
  .option("-f, --format <list>", "Comma list: json,md,html", "json,md,html")
  .option("--rescan", "Force a fresh scan before reporting")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    process.exitCode = await runReport(root, {
      format: opts.format,
      rescan: opts.rescan,
    });
  });

program
  .command("fix")
  .description("Print Fix Path™ recommendations (no auto-patch in v1)")
  .option("--apply", "Refused unless --yes; still writes suggestion files only")
  .option("--yes", "Acknowledge --apply (still no source overwrite)")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    process.exitCode = await runFix(root, {
      apply: opts.apply,
      yes: opts.yes,
    });
  });

program
  .command("auth")
  .description("Stub: future cloud login (stores nothing)")
  .action(async () => {
    await runAuth();
  });

program
  .command("version")
  .description("Print package version")
  .action(async () => {
    await runVersion();
  });

program
  .command("update")
  .description("Check npm for @moneygap/cli updates (soft-fail offline)")
  .action(async () => {
    process.exitCode = await runUpdate();
  });

program
  .command("config")
  .description("Show / validate / print path of resolved config")
  .option("--validate", "Validate config schema")
  .option("--path", "Print config file path only")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.opts()?.cwd);
    process.exitCode = await runConfig(root, {
      validate: opts.validate,
      pathOnly: opts.path,
    });
  });

const generate = program
  .command("generate")
  .description("Generate project artifacts");
generate
  .command("llms")
  .description("Generate public/llms.txt AI guidance file")
  .option("--force", "Overwrite existing llms.txt")
  .option("--out <path>", "Output path", "public/llms.txt")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.parent?.opts()?.cwd);
    process.exitCode = await runGenerateLlms(root, {
      force: opts.force,
      out: opts.out,
    });
  });

const validate = program
  .command("validate")
  .description("Validate project artifacts");
validate
  .command("llms")
  .description("Validate llms.txt structure and quality")
  .option("--path <file>", "Path to llms.txt")
  .action(async (opts, cmd) => {
    const root = resolveCwd(cmd.parent?.parent?.opts()?.cwd);
    process.exitCode = await runValidateLlms(root, { path: opts.path });
  });

program
  .command("help", { isDefault: false })
  .description("Show help")
  .action(() => {
    program.outputHelp();
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = EXIT.ERROR;
  }
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].includes("moneygap"));

if (isDirect) {
  void main();
}

export { program, main };
