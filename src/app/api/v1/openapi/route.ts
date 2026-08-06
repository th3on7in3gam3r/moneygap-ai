import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

/** Convenience alias — same document as /openapi/moneygap-v1.json */
export async function GET() {
  const raw = readFileSync(
    join(process.cwd(), "public/openapi/moneygap-v1.json"),
    "utf8",
  );
  return NextResponse.json(JSON.parse(raw) as Record<string, unknown>, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
