type LogLevel = "debug" | "info" | "warn" | "error";

export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 400;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log("warn", "retry", {
        label: opts.label ?? "op",
        attempt: i + 1,
        attempts,
        error: err instanceof Error ? err.message : String(err),
      });
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

export function isMaintenanceMode() {
  const v = process.env.MAINTENANCE_MODE;
  return v === "1" || v === "true";
}

export function isTrustEngineEnabled() {
  const v = process.env.FEATURE_TRUST_ENGINE;
  if (v === "0" || v === "false") return false;
  return true;
}
