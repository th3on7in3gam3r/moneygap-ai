export type AiErrorClass =
  | "AI_TIMEOUT"
  | "AI_RATE_LIMIT"
  | "AI_CONTEXT_LIMIT"
  | "AI_INVALID_JSON"
  | "AI_PROVIDER_ERROR"
  | "REPORT_VALIDATION_ERROR"
  | "DATABASE_WRITE_ERROR"
  | "UNKNOWN";

export class AnalysisPipelineError extends Error {
  readonly errorClass: AiErrorClass;
  readonly retryable: boolean;
  readonly causeMessage?: string;

  constructor(
    message: string,
    opts: {
      errorClass: AiErrorClass;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "AnalysisPipelineError";
    this.errorClass = opts.errorClass;
    this.retryable = Boolean(opts.retryable);
    if (opts.cause instanceof Error) this.causeMessage = opts.cause.message;
    else if (opts.cause != null) this.causeMessage = String(opts.cause);
  }
}

export function classifyAiError(err: unknown): AiErrorClass {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  const name = err instanceof Error ? err.name : "";

  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborted")
  ) {
    return "AI_TIMEOUT";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return "AI_RATE_LIMIT";
  }
  if (
    lower.includes("context length") ||
    lower.includes("maximum context") ||
    lower.includes("token") && lower.includes("limit") ||
    lower.includes("context_length_exceeded")
  ) {
    return "AI_CONTEXT_LIMIT";
  }
  if (
    lower.includes("json") ||
    lower.includes("unexpected token") ||
    lower.includes("parse")
  ) {
    return "AI_INVALID_JSON";
  }
  if (
    lower.includes("unique") ||
    lower.includes("duplicate key") ||
    lower.includes("violates") ||
    lower.includes("foreign key") ||
    lower.includes("not-null") ||
    lower.includes("null value")
  ) {
    return "DATABASE_WRITE_ERROR";
  }
  if (lower.includes("validation") || lower.includes("zod")) {
    return "REPORT_VALIDATION_ERROR";
  }
  return "AI_PROVIDER_ERROR";
}

export function classifyDbError(err: unknown): AiErrorClass {
  const cls = classifyAiError(err);
  return cls === "AI_PROVIDER_ERROR" ? "DATABASE_WRITE_ERROR" : cls;
}
