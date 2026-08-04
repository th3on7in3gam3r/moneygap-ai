import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { MoneyGapConfig } from "../types/index.js";
import { pathExists, readJson, readText } from "../utils/fs.js";

const categorySchema = z.enum([
  "seo",
  "aeo",
  "performance",
  "accessibility",
  "trust",
  "growth",
]);

export const moneyGapConfigSchema = z.object({
  projectName: z.string().optional(),
  ignore: z.array(z.string()).default([
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/.moneygap/**",
  ]),
  weights: z
    .object({
      seo: z.number().optional(),
      aeo: z.number().optional(),
      performance: z.number().optional(),
      accessibility: z.number().optional(),
      trust: z.number().optional(),
      growth: z.number().optional(),
    })
    .optional(),
  rules: z
    .object({
      disable: z.array(z.string()).optional(),
    })
    .optional(),
  branding: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  meta: z.record(z.string()).optional(),
  failOnSeverity: z
    .array(z.enum(["critical", "high", "medium", "low", "info"]))
    .optional(),
});

export const DEFAULT_CONFIG: MoneyGapConfig = moneyGapConfigSchema.parse({});

export async function loadConfig(
  projectRoot: string,
): Promise<{ config: MoneyGapConfig; path: string | null }> {
  const candidates = [
    "moneygap.config.ts",
    "moneygap.config.mjs",
    "moneygap.config.js",
    "moneygap.config.json",
  ];

  for (const name of candidates) {
    const full = path.join(projectRoot, name);
    if (!(await pathExists(full))) continue;

    if (name.endsWith(".json")) {
      const raw = await readJson<unknown>(full);
      const parsed = moneyGapConfigSchema.safeParse(raw ?? {});
      if (!parsed.success) {
        throw new Error(`Invalid ${name}: ${parsed.error.message}`);
      }
      return { config: parsed.data, path: full };
    }

    try {
      const mod = await import(pathToFileURL(full).href);
      const raw = (mod.default ?? mod.config ?? mod) as unknown;
      const parsed = moneyGapConfigSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Invalid ${name}: ${parsed.error.message}`);
      }
      return { config: parsed.data, path: full };
    } catch (err) {
      // TS configs may need tsx; try reading as JSON-like export fallback
      const text = await readText(full);
      if (text) {
        const m = text.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
        if (m) {
          try {
            // eslint-disable-next-line no-new-func
            const obj = new Function(`return (${m[1]})`)();
            const parsed = moneyGapConfigSchema.safeParse(obj);
            if (parsed.success) return { config: parsed.data, path: full };
          } catch {
            /* fall through */
          }
        }
      }
      throw err instanceof Error
        ? err
        : new Error(`Could not load config ${name}`);
    }
  }

  return { config: DEFAULT_CONFIG, path: null };
}

export function defaultConfigSource(projectName?: string): string {
  const name = projectName ? `"${projectName}"` : "undefined";
  return `/** @type {import('@moneygap/cli').MoneyGapConfig} */
const config = {
  projectName: ${name === "undefined" ? "undefined" : name},
  ignore: [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/.moneygap/**",
  ],
  // weights: { seo: 1, aeo: 1, performance: 1, accessibility: 1, trust: 1, growth: 1 },
  // rules: { disable: [] },
};

export default config;
`;
}

export { categorySchema };
