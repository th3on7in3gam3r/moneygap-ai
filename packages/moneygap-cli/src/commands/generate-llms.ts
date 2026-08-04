import path from "node:path";
import chalk from "chalk";
import { generateLlmsFile } from "../ai-readiness/index.js";
import { loadConfig } from "../config/load.js";
import { detectFramework } from "../frameworks/detect.js";
import { EXIT } from "../utils/constants.js";
import { pathExists, readJson, writeText } from "../utils/fs.js";

export async function runGenerateLlms(
  projectRoot: string,
  opts: { force?: boolean; out?: string } = {},
): Promise<number> {
  try {
    const outRel = opts.out ?? path.join("public", "llms.txt");
    const outPath = path.isAbsolute(outRel)
      ? outRel
      : path.join(projectRoot, outRel);

    if ((await pathExists(outPath)) && !opts.force) {
      console.error(
        chalk.red(
          `${outRel} already exists. Pass --force to overwrite (confirmation required).`,
        ),
      );
      return EXIT.ERROR;
    }

    const { config } = await loadConfig(projectRoot);
    const pkg = await readJson<{ name?: string }>(
      path.join(projectRoot, "package.json"),
    );
    const fw = await detectFramework(projectRoot);
    const name =
      config.projectName ||
      config.branding?.name ||
      pkg?.name ||
      path.basename(projectRoot);

    const content = generateLlmsFile({
      organizationName: name,
      domain: name.includes(".") ? name : `${name}.example`,
      summary: `${name} (${fw.name}) — growth intelligence and AI-ready web presence.`,
      products: [name],
      audience: "Developers, marketers, and growth teams.",
      importantUrls: [
        { label: "Home", url: "/" },
        { label: "Docs", url: "/docs" },
      ],
    });

    // Prefer absolute-looking placeholders when domain unknown — rewrite relative later by user
    await writeText(outPath, content);
    console.log(chalk.green(`Wrote ${outPath}`));
    console.log(chalk.dim("Review URLs, then run: moneygap validate llms"));
    return EXIT.OK;
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    return EXIT.ERROR;
  }
}
