export type DiagnosticSeverity = "pass" | "warn" | "fail" | "info";

export type DiagnosticCategory =
  | "crawlability"
  | "schema"
  | "performance"
  | "fetch";

export type DiagnosticFinding = {
  id: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  title: string;
  detail: string;
};

export type DiagnosticStageId =
  | "fetching"
  | "crawlability"
  | "schema"
  | "performance"
  | "scoring";

export type DiagnosticStage = {
  id: DiagnosticStageId;
  label: string;
  status: "pending" | "running" | "done" | "error";
};

export type LiveDiagnosticsResult = {
  url: string;
  finalUrl: string;
  score: number;
  findings: DiagnosticFinding[];
  stages: DiagnosticStage[];
  durationMs: number;
  meta: {
    title: string | null;
    statusCode: number;
    htmlBytes: number;
    hasJsonLd: boolean;
    schemaTypes: string[];
  };
};

export type LiveDiagnosticsOptions = {
  timeoutMs?: number;
  maxHtmlBytes?: number;
  userAgent?: string;
  onStage?: (stage: DiagnosticStage) => void;
};

export const SANDBOX_STORAGE_KEY = "mg_sandbox";

export type SandboxStoragePayload = {
  url: string;
  score: number;
  findingIds: string[];
  ts: number;
};
