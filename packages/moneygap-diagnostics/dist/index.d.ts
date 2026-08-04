type DiagnosticSeverity = "pass" | "warn" | "fail" | "info";
type DiagnosticCategory = "crawlability" | "schema" | "performance" | "fetch";
type DiagnosticFinding = {
    id: string;
    category: DiagnosticCategory;
    severity: DiagnosticSeverity;
    title: string;
    detail: string;
};
type DiagnosticStageId = "fetching" | "crawlability" | "schema" | "performance" | "scoring";
type DiagnosticStage = {
    id: DiagnosticStageId;
    label: string;
    status: "pending" | "running" | "done" | "error";
};
type LiveDiagnosticsResult = {
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
type LiveDiagnosticsOptions = {
    timeoutMs?: number;
    maxHtmlBytes?: number;
    userAgent?: string;
    onStage?: (stage: DiagnosticStage) => void;
};
declare const SANDBOX_STORAGE_KEY = "mg_sandbox";
type SandboxStoragePayload = {
    url: string;
    score: number;
    findingIds: string[];
    ts: number;
};

declare function isPrivateHostname(hostname: string): boolean;
declare function normalizePublicUrl(input: string): {
    ok: true;
    href: string;
    origin: string;
    hostname: string;
} | {
    ok: false;
    error: string;
};

declare function scoreFindings(findings: DiagnosticFinding[]): number;
declare function hasCriticalFailures(findings: DiagnosticFinding[]): boolean;

declare function runLiveDiagnostics(inputUrl: string, options?: LiveDiagnosticsOptions): Promise<{
    ok: true;
    result: LiveDiagnosticsResult;
} | {
    ok: false;
    error: string;
    result?: LiveDiagnosticsResult;
}>;

export { type DiagnosticCategory, type DiagnosticFinding, type DiagnosticSeverity, type DiagnosticStage, type DiagnosticStageId, type LiveDiagnosticsOptions, type LiveDiagnosticsResult, SANDBOX_STORAGE_KEY, type SandboxStoragePayload, hasCriticalFailures, isPrivateHostname, normalizePublicUrl, runLiveDiagnostics, scoreFindings };
