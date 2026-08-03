import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { extensionReports } from "@/db/schema";
import {
  hostnameOf,
  isValidExtensionReport,
  type ExtensionMoneyGapReport,
} from "@/lib/extension-reports/types";
import { absoluteUrl } from "@/lib/seo/site";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 900_000;

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-moneygap-sync-secret, x-moneygap-extension",
    "Access-Control-Max-Age": "86400",
  };
}

function authorizeIngest(req: Request): boolean {
  const syncSecret = process.env.EXTENSION_SYNC_SECRET?.trim();
  const headerSecret = req.headers.get("x-moneygap-sync-secret");
  if (syncSecret && headerSecret && headerSecret === syncSecret) {
    return true;
  }
  // Chrome Web Store package cannot hold a real secret. Extension clients
  // send this marker; optional EXTENSION_SYNC_SECRET still works for backends.
  if (req.headers.get("x-moneygap-extension") === "1") {
    return true;
  }
  // Dev convenience when no secret is configured.
  return !syncSecret;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503, headers },
    );
  }

  if (!authorizeIngest(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers },
    );
  }

  let body: { report?: unknown };
  try {
    body = (await req.json()) as { report?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    );
  }

  if (!isValidExtensionReport(body.report)) {
    return NextResponse.json(
      { error: "Invalid report payload" },
      { status: 400, headers },
    );
  }

  const report = body.report as ExtensionMoneyGapReport;
  const shareId = (report.shareId ?? report.id).slice(0, 120);
  const url = report.analysis.url.slice(0, 2000);
  const hostname = hostnameOf(url).slice(0, 255);
  const overallScore = Math.max(
    0,
    Math.min(100, Math.round(report.scores.overall)),
  );
  const now = new Date();

  await db
    .insert(extensionReports)
    .values({
      id: report.id.slice(0, 120),
      shareId,
      url,
      hostname,
      overallScore,
      payload: report,
      createdAt: report.createdAt ? new Date(report.createdAt) : now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: extensionReports.id,
      set: {
        shareId,
        url,
        hostname,
        overallScore,
        payload: report,
        updatedAt: now,
      },
    });

  return NextResponse.json(
    {
      ok: true,
      shareId,
      shareUrl: absoluteUrl(`/report/ext/${encodeURIComponent(shareId)}`),
    },
    { headers },
  );
}
