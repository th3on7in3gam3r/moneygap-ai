import type { Analyzer } from "../types/index.js";

const extraAnalyzers: Analyzer[] = [];
const extraReporters: { id: string; render: (data: unknown) => Promise<void> | void }[] =
  [];

export function registerAnalyzer(analyzer: Analyzer): void {
  extraAnalyzers.push(analyzer);
}

export function getRegisteredAnalyzers(): Analyzer[] {
  return [...extraAnalyzers];
}

export function registerReporter(reporter: {
  id: string;
  render: (data: unknown) => Promise<void> | void;
}): void {
  extraReporters.push(reporter);
}

export function getRegisteredReporters() {
  return [...extraReporters];
}

export type MoneyGapPlugin = {
  name: string;
  setup: (api: {
    registerAnalyzer: typeof registerAnalyzer;
    registerReporter: typeof registerReporter;
  }) => void;
};

/** v1: no auto-discovery of moneygap-plugin-* packages yet */
export async function loadPlugins(): Promise<string[]> {
  return [];
}
