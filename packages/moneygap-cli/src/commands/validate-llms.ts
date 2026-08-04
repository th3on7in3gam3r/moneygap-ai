import path from "node:path";
import chalk from "chalk";
import { validateLlmsFile } from "../ai-readiness/index.js";
import { EXIT } from "../utils/constants.js";
import { pathExists, readText } from "../utils/fs.js";

export async function runValidateLlms(
  projectRoot: string,
  opts: { path?: string } = {},
): Promise<number> {
  try {
    let file: string | null = null;
    if (opts.path) {
      file = path.isAbsolute(opts.path)
        ? opts.path
        : path.join(projectRoot, opts.path);
    } else {
      const candidates = [
        path.join(projectRoot, "public", "llms.txt"),
        path.join(projectRoot, "llms.txt"),
      ];
      for (const c of candidates) {
        if (await pathExists(c)) {
          file = c;
          break;
        }
      }
    }

    const content = file ? await readText(file) : null;
    const result = validateLlmsFile(content);

    console.log();
    console.log(chalk.bold("llms.txt validation"));
    console.log(
      chalk.dim(
        file
          ? `File: ${file}`
          : "File: (not found — validating as missing)",
      ),
    );
    console.log(`Ruleset: ${result.rulesetVersion}`);
    console.log(`Score: ${result.score}/100`);
    console.log();

    if (result.errors.length) {
      console.log(chalk.red.bold("Errors"));
      for (const e of result.errors) console.log(`  ✗ [${e.ruleId}] ${e.message}`);
      console.log();
    }
    if (result.warnings.length) {
      console.log(chalk.yellow.bold("Warnings"));
      for (const w of result.warnings)
        console.log(`  ! [${w.ruleId}] ${w.message}`);
      console.log();
    }
    if (result.suggestions.length) {
      console.log(chalk.cyan.bold("Suggestions"));
      for (const s of result.suggestions)
        console.log(`  · [${s.ruleId}] ${s.message}`);
      console.log();
    }

    if (result.recommendations[0]) {
      console.log(chalk.bold("Top action"));
      const r = result.recommendations[0];
      console.log(`  ${r.title} (${r.priority}, effort: ${r.estimatedEffort})`);
      console.log(`  ${r.recommendedAction}`);
      console.log();
    }

    return result.errors.length > 0 ? EXIT.FINDINGS : EXIT.OK;
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    return EXIT.ERROR;
  }
}
