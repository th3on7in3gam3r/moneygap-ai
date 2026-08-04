import { createHash, randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { publicAuditSnapshots, type PublicAuditSnapshot } from "@/db/schema";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";

export function makeAuditSlug(): string {
  return randomBytes(6).toString("hex");
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export async function createPublicAuditSnapshot(input: {
  url: string;
  score: number;
  findings: DiagnosticFinding[];
  durationMs?: number;
  source?: "sandbox" | "cli" | "compare";
  comparePeerSlug?: string | null;
}): Promise<PublicAuditSnapshot> {
  const slug = makeAuditSlug();
  const [row] = await db
    .insert(publicAuditSnapshots)
    .values({
      slug,
      hostname: hostnameFromUrl(input.url),
      url: input.url,
      score: input.score,
      findings: input.findings,
      durationMs: input.durationMs ?? null,
      source: input.source ?? "sandbox",
      comparePeerSlug: input.comparePeerSlug ?? null,
    })
    .returning();
  return row;
}

export async function getPublicAuditBySlug(slug: string) {
  return (
    (await db.query.publicAuditSnapshots.findFirst({
      where: eq(publicAuditSnapshots.slug, slug),
    })) ?? null
  );
}

export async function listRecentPublicAudits(limit = 24) {
  return db.query.publicAuditSnapshots.findMany({
    orderBy: [desc(publicAuditSnapshots.createdAt)],
    limit,
  });
}

export function clientIpHash(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
