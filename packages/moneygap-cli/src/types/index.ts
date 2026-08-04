export type Category =
  | "seo"
  | "aeo"
  | "performance"
  | "accessibility"
  | "trust"
  | "growth"
  | "aiReadiness";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  ruleId: string;
  title: string;
  severity: Severity;
  category: Category;
  explanation: string;
  recommendation: string;
  docsUrl: string;
  estimatedImpact: string;
  file?: string;
};

export type FrameworkInfo = {
  id: string;
  name: string;
  version: string | null;
};

export type CategoryScores = Record<Category, number>;

export type ScanResult = {
  version: string;
  scannedAt: string;
  projectRoot: string;
  projectName: string;
  framework: FrameworkInfo;
  overallScore: number;
  categoryScores: CategoryScores;
  findings: Finding[];
  executiveSummary: string;
  durationMs: number;
};

export type AnalyzerContext = {
  projectRoot: string;
  framework: FrameworkInfo;
  files: string[];
  htmlSnippets: { file: string; content: string }[];
  packageJson: Record<string, unknown> | null;
  config: MoneyGapConfig;
};

export type Analyzer = {
  id: string;
  category: Category;
  run: (ctx: AnalyzerContext) => Promise<Finding[]> | Finding[];
};

export type MoneyGapConfig = {
  projectName?: string;
  ignore: string[];
  weights?: Partial<Record<Category, number>>;
  rules?: { disable?: string[] };
  branding?: { name?: string };
  meta?: Record<string, string>;
  failOnSeverity?: Severity[];
};
