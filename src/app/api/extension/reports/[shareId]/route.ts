import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { extensionReports } from "@/db/schema";
import type { ExtensionMoneyGapReport } from "@/lib/extension-reports/types";

export const runtime = "nodejs";

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const headers = corsHeaders(req);
  const { shareId } = await params;

  if (!shareId || shareId.length > 120) {
    return NextResponse.json(
      { error: "Invalid share id" },
      { status: 400, headers },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503, headers },
    );
  }

  const [row] = await db
    .select()
    .from(extensionReports)
    .where(eq(extensionReports.shareId, shareId))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers },
    );
  }

  return NextResponse.json(
    {
      report: row.payload as ExtensionMoneyGapReport,
      meta: {
        shareId: row.shareId,
        hostname: row.hostname,
        url: row.url,
        overallScore: row.overallScore,
        createdAt: row.createdAt.toISOString(),
      },
    },
    { headers },
  );
}
