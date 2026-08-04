import PDFDocument from "pdfkit";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";
import { getSiteOrigin } from "@/lib/seo/site";

const ACCENT = "#0f7a56";
const FG = "#121816";
const MUTED = "#5a6b62";

export type OpenAuditPdfInput = {
  hostname: string;
  url?: string | null;
  score: number;
  findings: DiagnosticFinding[];
  source?: string | null;
  createdAt?: Date | string | null;
};

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildOpenAuditPdf(input: OpenAuditPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
      info: {
        Title: `MoneyGap Open Audit — ${input.hostname}`,
        Author: "MoneyGap AI",
        Subject: `Sandbox diagnostics score ${input.score}/100`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const origin = getSiteOrigin();
    const created =
      input.createdAt instanceof Date
        ? input.createdAt.toLocaleString()
        : input.createdAt
          ? new Date(input.createdAt).toLocaleString()
          : new Date().toLocaleString();

    doc
      .fillColor(ACCENT)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("MONEYGAP AI", { characterSpacing: 1.5 });

    doc.moveDown(0.4);
    doc
      .fillColor(FG)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Open Audit");

    doc.moveDown(0.3);
    doc
      .fillColor(FG)
      .fontSize(16)
      .font("Helvetica")
      .text(input.hostname);

    doc.moveDown(0.5);
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .text(
        [
          `Score ${input.score}/100`,
          input.source ? `Source: ${input.source}` : null,
          created,
        ]
          .filter(Boolean)
          .join("  ·  "),
      );

    if (input.url) {
      doc.moveDown(0.25);
      doc.fillColor(MUTED).fontSize(9).text(truncate(input.url, 120), {
        link: input.url,
      });
    }

    doc.moveDown(0.8);
    doc
      .strokeColor("#d5ddd8")
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    doc.moveDown(0.8);
    doc
      .fillColor(FG)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Findings");

    doc.moveDown(0.4);
    const findings = input.findings.slice(0, 40);
    if (findings.length === 0) {
      doc.fillColor(MUTED).fontSize(10).font("Helvetica").text("No findings.");
    } else {
      for (const f of findings) {
        const blockTop = doc.y;
        if (blockTop > doc.page.height - 120) {
          doc.addPage();
        }

        doc
          .fillColor(FG)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`[${f.severity.toUpperCase()}] ${truncate(f.title, 90)}`);

        doc
          .fillColor(MUTED)
          .fontSize(9)
          .font("Helvetica")
          .text(truncate(f.detail, 280), {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          });

        doc.moveDown(0.55);
      }
    }

    doc.moveDown(0.6);
    doc
      .strokeColor("#d5ddd8")
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    doc.moveDown(0.7);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font("Helvetica")
      .text(
        "These are free heuristics — not a full MoneyGap Engine™ report with Fix Paths™. AI Estimate / heuristic scan — not legal, financial, or compliance advice.",
        {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        },
      );

    doc.moveDown(0.6);
    const trialUrl = `${origin}/pricing`;
    doc
      .fillColor(ACCENT)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Start Free Trial →", { link: trialUrl, underline: true });

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text(trialUrl, { link: trialUrl });

    doc.end();
  });
}

export function auditPdfFilename(hostname: string, slug: string): string {
  const safeHost = hostname.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase() || "site";
  return `moneygap-${safeHost}-${slug}.pdf`;
}
