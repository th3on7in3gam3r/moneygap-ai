import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cliCicdWaitlist } from "@/db/schema";
import {
  clientIpHash,
  createPublicAuditSnapshot,
  hostnameFromUrl,
} from "@/lib/labs/audits";
import {
  auditPdfFilename,
  buildOpenAuditPdf,
} from "@/lib/labs/audit-pdf";
import { sendEmail } from "@/lib/email/services/send";
import { renderCliVisualReport } from "@/lib/email/templates/cli-visual-report";
import { log } from "@/lib/observability/logger";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";
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
  source: z.enum(["cli", "sandbox"]).optional().default("cli"),
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
  const findings = parsed.data.findings as DiagnosticFinding[];
  const source = parsed.data.source;

  try {
    const row = await createPublicAuditSnapshot({
      url: parsed.data.url,
      score,
      findings,
      durationMs: parsed.data.durationMs,
      source,
    });

    const href = `/labs/audits/${row.slug}`;
    const pdfHref = `/api/public/audits/${row.slug}/pdf`;
    const hostname = hostnameFromUrl(parsed.data.url);

    try {
      await db.insert(cliCicdWaitlist).values({
        email,
        source: source === "sandbox" ? "sandbox" : "cli_scan",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/unique|duplicate/i.test(msg)) {
        log("warn", "cli_report_waitlist_insert_failed", {
          error: msg.slice(0, 200),
        });
      }
    }

    const pdf = await buildOpenAuditPdf({
      hostname,
      url: parsed.data.url,
      score,
      findings,
      source,
      createdAt: row.createdAt,
    });
    const filename = auditPdfFilename(hostname, row.slug);

    const tpl = renderCliVisualReport({
      email,
      hostname,
      score,
      auditPath: href,
      pdfPath: pdfHref,
    });
    const sendResult = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      attachments: [
        {
          filename,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    const emailed = sendResult.ok === true;
    if (!emailed) {
      log("warn", "cli_report_email_soft_fail", {
        email,
        slug: row.slug,
        source,
        error: "error" in sendResult ? sendResult.error : "send_failed",
      });
    } else {
      log("info", "cli_report_emailed", {
        email,
        slug: row.slug,
        score,
        source,
      });
    }

    return NextResponse.json({
      ok: true,
      slug: row.slug,
      href,
      pdfHref,
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
