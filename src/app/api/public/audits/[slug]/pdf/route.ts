import { NextResponse } from "next/server";
import {
  auditPdfFilename,
  buildOpenAuditPdf,
} from "@/lib/labs/audit-pdf";
import {
  clientIpHash,
  getPublicAuditBySlug,
} from "@/lib/labs/audits";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const ipHash = clientIpHash(req);
  const limit = checkRateLimit({
    key: `audit-pdf:${ipHash}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit — try again later." },
      { status: 429 },
    );
  }

  const { slug } = await params;
  if (!slug || slug.length > 32) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const row = await getPublicAuditBySlug(slug).catch(() => null);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const pdf = await buildOpenAuditPdf({
      hostname: row.hostname,
      url: row.url,
      score: row.score,
      findings: (row.findings as DiagnosticFinding[]) ?? [],
      source: row.source,
      createdAt: row.createdAt,
    });

    const filename = auditPdfFilename(row.hostname, row.slug);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not generate PDF. Try again shortly.",
      },
      { status: 500 },
    );
  }
}
