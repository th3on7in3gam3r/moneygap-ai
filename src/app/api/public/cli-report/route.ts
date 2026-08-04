import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cliCicdWaitlist } from "@/db/schema";
import {
  clientIpHash,
  createPublicAuditSnapshot,
  hostnameFromUrl,
} from "@/lib/labs/audits";
import { sendEmail } from "@/lib/email/services/send";
import { renderCliVisualReport } from "@/lib/email/templates/cli-visual-report";
import { log } from "@/lib/observability/logger";
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
  email: z.string().email().max(200),
  url: z.string().url().max(2048),
  score: z.number().min(0).max(100),
  findings: z.array(findingSchema).max(50),
  durationMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const ipHash = clientIpHash(req);
  const limit = checkRateLimit({
    key: `cli-report:${ipHash}`,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit — try again later." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid report payload." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const score = Math.round(parsed.data.score);

  try {
    const row = await createPublicAuditSnapshot({
      url: parsed.data.url,
      score,
      findings: parsed.data
        .findings as import("@/lib/public-diagnostics").DiagnosticFinding[],
      durationMs: parsed.data.durationMs,
      source: "cli",
    });

    const href = `/labs/audits/${row.slug}`;
    const hostname = hostnameFromUrl(parsed.data.url);

    try {
      await db.insert(cliCicdWaitlist).values({ email, source: "cli_scan" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/unique|duplicate/i.test(msg)) {
        log("warn", "cli_report_waitlist_insert_failed", {
          error: msg.slice(0, 200),
        });
      }
    }

    const tpl = renderCliVisualReport({
      email,
      hostname,
      score,
      auditPath: href,
    });
    const sendResult = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    const emailed = sendResult.ok === true;
    if (!emailed) {
      log("warn", "cli_report_email_soft_fail", {
        email,
        slug: row.slug,
        error: "error" in sendResult ? sendResult.error : "send_failed",
      });
    } else {
      log("info", "cli_report_emailed", { email, slug: row.slug, score });
    }

    return NextResponse.json({
      ok: true,
      slug: row.slug,
      href,
      emailed,
    });
  } catch (err) {
    log("warn", "cli_report_failed", {
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not publish report.",
      },
      { status: 500 },
    );
  }
}
