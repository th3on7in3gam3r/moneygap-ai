import { PULSE_SCRIPT_SRC } from "@/lib/analytics/pulse";

export const runtime = "nodejs";

const PULSE_ORIGIN = new URL(PULSE_SCRIPT_SRC).origin;
const UPSTREAM = `${PULSE_ORIGIN}/api/collect`;

/**
 * Same-origin proxy for Cadence Pulse collect.
 * pulse.js uses credentials:"include", but the Pulse host CORS omits
 * Access-Control-Allow-Credentials — so browser POSTs fail cross-origin.
 * Point the pixel at this route via data-endpoint.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "application/json";
  const pulseKey = req.headers.get("x-pulse-key");
  const body = await req.arrayBuffer();

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    Accept: "application/json",
  };
  if (pulseKey) headers["X-Pulse-Key"] = pulseKey;

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers,
      body,
      // Server-to-server: no browser cookies needed
      cache: "no-store",
    });

    const resBody = await upstream.arrayBuffer();
    return new Response(resBody, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Pulse collect upstream unreachable" },
      { status: 502 },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Pulse-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
