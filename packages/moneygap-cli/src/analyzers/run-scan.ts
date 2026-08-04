import path from "node:path";
import fg from "fast-glob";
import { builtinAnalyzers } from "../analyzers/index.js";
import { loadConfig } from "../config/load.js";
import { detectFramework } from "../frameworks/detect.js";
import { filterDisabled } from "../rules/registry.js";
import { computeCategoryScores, executiveSummary } from "../scoring/score.js";
import { SCAN_SCHEMA_VERSION } from "../utils/constants.js";
import { moneygapDir, readJson, readText, writeText } from "../utils/fs.js";
import type {
  AnalyzerContext,
  Finding,
  MoneyGapConfig,
  ScanResult,
} from "../types/index.js";
import { getRegisteredAnalyzers } from "../plugins/api.js";

const SNIPPET_GLOBS = [
  "**/*.{html,htm}",
  "**/*.{tsx,jsx,vue,svelte,astro,mdx}",
  "**/layout.{tsx,jsx,js}",
  "**/page.{tsx,jsx,js}",
  "**/_document.{tsx,jsx,js}",
  "**/index.html",
];

export async function collectContext(
  projectRoot: string,
  config: MoneyGapConfig,
): Promise<AnalyzerContext> {
  const framework = await detectFramework(projectRoot);
  const packageJson = await readJson<Record<string, unknown>>(
    path.join(projectRoot, "package.json"),
  );

  const files = await fg(SNIPPET_GLOBS, {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
    ignore: config.ignore,
    dot: false,
  });

  const htmlSnippets: { file: string; content: string }[] = [];
  for (const file of files.slice(0, 200)) {
    const content = await readText(file);
    if (!content) continue;
    // Prefer files that look like markup / JSX with tags
    if (/<[a-zA-Z!]/.test(content) || /json-ld|schema\.org/i.test(content)) {
      htmlSnippets.push({
        file: path.relative(projectRoot, file),
        content: content.slice(0, 80_000),
      });
    }
  }

  return {
    projectRoot,
    framework,
    files: files.map((f) => path.relative(projectRoot, f)),
    htmlSnippets,
    packageJson,
    config,
  };
}

export async function runScan(projectRoot: string): Promise<ScanResult> {
  const started = Date.now();
  const { config } = await loadConfig(projectRoot);
  const ctx = await collectContext(projectRoot, config);

  const analyzers = [...builtinAnalyzers, ...getRegisteredAnalyzers()];
  const all: Finding[] = [];
  await Promise.all(
    analyzers.map(async (a) => {
      try {
        const part = await a.run(ctx);
        all.push(...part);
      } catch (err) {
        console.error(`Analyzer ${a.id} soft-fail`, err);
      }
    }),
  );

  const findings = filterDisabled(all, config.rules?.disable);
  const { categoryScores, overallScore } = computeCategoryScores(
    findings,
    config.weights,
  );

  const projectName =
    config.projectName ||
    config.branding?.name ||
    (ctx.packageJson?.name as string | undefined) ||
    path.basename(projectRoot);

  const result: ScanResult = {
    version: SCAN_SCHEMA_VERSION,
    scannedAt: new Date().toISOString(),
    projectRoot,
    projectName,
    framework: ctx.framework,
    overallScore,
    categoryScores,
    findings,
    executiveSummary: executiveSummary(overallScore, findings),
    durationMs: Date.now() - started,
  };

  const outDir = moneygapDir(projectRoot);
  await writeText(
    path.join(outDir, "last-scan.json"),
    JSON.stringify(result, null, 2),
  );

  return result;
}

export async function loadLastScan(
  projectRoot: string,
): Promise<ScanResult | null> {
  return readJson<ScanResult>(
    path.join(moneygapDir(projectRoot), "last-scan.json"),
  );
}
