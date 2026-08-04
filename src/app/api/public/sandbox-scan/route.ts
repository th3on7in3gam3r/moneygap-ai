import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  runLiveDiagnostics,
  type LiveDiagnosticsResult,
} from "@/lib/public-diagnostics";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipHash = hashIp(ip);

  const hour = checkRateLimit({
    key: `sandbox-scan:h:${ipHash}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!hour.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again later (5 free scans per hour).",
        code: "rate_limited",
        retryAfterMs: hour.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(hour.retryAfterMs / 1000)),
        },
      },
    );
  }

  const day = checkRateLimit({
    key: `sandbox-scan:d:${ipHash}`,
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!day.ok) {
    return NextResponse.json(
      {
        error: "Daily sandbox limit reached (20 scans). Create a free account for full scans.",
        code: "rate_limited",
        retryAfterMs: day.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(day.retryAfterMs / 1000)),
        },
      },
    );
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) {
    return NextResponse.json(
      { error: "Enter a website URL to scan." },
      { status: 400 },
    );
  }

  const outcome = await runLiveDiagnostics(url, {
    timeoutMs: 15_000,
    maxHtmlBytes: 1_500_000,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        error: outcome.error,
        result: outcome.result ?? null,
      },
      { status: outcome.result ? 422 : 400 },
    );
  }

  const result: LiveDiagnosticsResult = outcome.result;
  return NextResponse.json({
    ok: true,
    result,
  });
}
