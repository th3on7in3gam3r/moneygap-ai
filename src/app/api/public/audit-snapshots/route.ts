import { z } from "zod";
import { NextResponse } from "next/server";
import {
  clientIpHash,
  createPublicAuditSnapshot,
} from "@/lib/labs/audits";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const findingSchema = z.object({
  id: z.string(),
  category: z.string(),
  severity: z.enum(["pass", "warn", "fail", "info"]),
  title: z.string(),
  detail: z.string(),
});

const bodySchema = z.object({
  url: z.string().url().max(2048),
  score: z.number().min(0).max(100),
  findings: z.array(findingSchema).max(50),
  durationMs: z.number().int().nonnegative().optional(),
  source: z.enum(["sandbox", "cli", "compare"]).optional(),
  comparePeerSlug: z.string().max(32).optional().nullable(),
});

export async function POST(req: Request) {
  const ipHash = clientIpHash(req);
  const limit = checkRateLimit({
    key: `audit-publish:${ipHash}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Publish rate limit — try again later." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid audit payload." },
      { status: 400 },
    );
  }

  try {
    const row = await createPublicAuditSnapshot({
      url: parsed.data.url,
      score: Math.round(parsed.data.score),
      findings: parsed.data.findings as import("@/lib/public-diagnostics").DiagnosticFinding[],
      durationMs: parsed.data.durationMs,
      source: parsed.data.source,
      comparePeerSlug: parsed.data.comparePeerSlug,
    });
    return NextResponse.json({
      ok: true,
      slug: row.slug,
      href: `/labs/audits/${row.slug}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not publish audit.",
      },
      { status: 500 },
    );
  }
}
