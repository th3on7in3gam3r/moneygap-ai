export type ClassifiedNetworkError = {
  kind: "dns" | "tcp" | "tls" | "timeout" | "reset" | "refused" | "network" | "unknown";
  code: string;
  message: string;
  timeoutReason?: string;
};

function walkCauses(err: unknown): unknown[] {
  const out: unknown[] = [err];
  let cur: unknown = err;
  for (let i = 0; i < 6; i++) {
    if (!cur || typeof cur !== "object") break;
    const next = (cur as { cause?: unknown }).cause;
    if (!next) break;
    out.push(next);
    cur = next;
  }
  return out;
}

function codeOf(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const o = err as { code?: string; name?: string; message?: string };
  return String(o.code ?? o.name ?? "").toUpperCase();
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "");
}

/**
 * Map Node / Undici / fetch failures to stable connectivity categories.
 * Never collapses TLS vs DNS vs timeout into a generic "unreachable".
 */
export function classifyNetworkError(err: unknown): ClassifiedNetworkError {
  const chain = walkCauses(err);
  const codes = chain.map(codeOf).filter(Boolean);
  const messages = chain.map(messageOf).join(" | ");
  const blob = `${codes.join(" ")} ${messages}`.toUpperCase();

  const primaryCode =
    codes.find((c) =>
      /ENOTFOUND|EAI_AGAIN|ESERVFAIL|ENODATA|CERT_|UNABLE_TO_|ERR_TLS|ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR|AbortError|TimeoutError/i.test(
        c,
      ),
    ) ||
    codes[0] ||
    "UNKNOWN";

  if (
    /ENOTFOUND|EAI_AGAIN|ESERVFAIL|ENODATA|GETADDRINFO/.test(blob) ||
    blob.includes("DNS")
  ) {
    return {
      kind: "dns",
      code: primaryCode,
      message: messages || "DNS lookup failed",
    };
  }

  if (
    /CERT_|UNABLE_TO_VERIFY|ERR_TLS|TLSV1|SSL_|CERTIFICATE|DEPTH_ZERO_SELF_SIGNED|HOSTNAME\/IP_DOES_NOT_MATCH/.test(
      blob,
    )
  ) {
    return {
      kind: "tls",
      code: primaryCode,
      message: messages || "TLS handshake failed",
    };
  }

  if (
    /TIMEOUT|TIMED\s*OUT|ABORTED|ABORTERROR|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT/.test(
      blob,
    ) ||
    (err instanceof Error && err.name === "TimeoutError")
  ) {
    let timeoutReason = "request_timeout";
    if (/CONNECT_TIMEOUT/.test(blob)) timeoutReason = "connect_timeout";
    else if (/HEADERS_TIMEOUT/.test(blob)) timeoutReason = "headers_timeout";
    else if (/BODY_TIMEOUT/.test(blob)) timeoutReason = "body_timeout";
    return {
      kind: "timeout",
      code: primaryCode,
      message: messages || "Request timed out",
      timeoutReason,
    };
  }

  if (/ECONNREFUSED/.test(blob)) {
    return {
      kind: "refused",
      code: primaryCode,
      message: messages || "Connection refused",
    };
  }

  if (/ECONNRESET|EPIPE|UND_ERR_SOCKET/.test(blob)) {
    return {
      kind: "reset",
      code: primaryCode,
      message: messages || "Connection reset",
    };
  }

  if (/EHOSTUNREACH|ENETUNREACH|ECONN/.test(blob)) {
    return {
      kind: "tcp",
      code: primaryCode,
      message: messages || "TCP connect failed",
    };
  }

  return {
    kind: "network",
    code: primaryCode,
    message: messages || "Network error",
  };
}
