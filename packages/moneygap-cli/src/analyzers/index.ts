import { accessibilityAnalyzer } from "./accessibility.js";
import { aeoAnalyzer } from "./aeo.js";
import { growthAnalyzer } from "./growth.js";
import { performanceAnalyzer } from "./performance.js";
import { seoAnalyzer } from "./seo.js";
import { trustAnalyzer } from "./trust.js";
import type { Analyzer } from "../types/index.js";

export const builtinAnalyzers: Analyzer[] = [
  seoAnalyzer,
  aeoAnalyzer,
  performanceAnalyzer,
  accessibilityAnalyzer,
  trustAnalyzer,
  growthAnalyzer,
];
