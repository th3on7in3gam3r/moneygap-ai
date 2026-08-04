import PDFDocument from "pdfkit";
import type { DiagnosticFinding } from "@/lib/public-diagnostics";
import { getSiteOrigin } from "@/lib/seo/site";

const ACCENT = "#0f7a56";
const ACCENT_SOFT = "#d8f3e7";
const FG = "#121816";
const MUTED = "#5a6b62";
const RULE = "#d5ddd8";
const PAGE_BG_BAND = "#f4f6f4";

const SEVERITY_COLORS: Record<
  DiagnosticFinding["severity"],
  { fg: string; bg: string; label: string }
> = {
  pass: { fg: "#0f7a56", bg: "#d8f3e7", label: "PASS" },
  warn: { fg: "#9a5b12", bg: "#fdecc8", label: "WARN" },
  fail: { fg: "#b42318", bg: "#fce8e6", label: "FAIL" },
  info: { fg: "#3d5a80", bg: "#e4eef8", label: "INFO" },
};

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

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawRoundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
): void {
  doc.save();
  doc.fillColor(fill);
  doc.roundedRect(x, y, w, h, r).fill();
  doc.restore();
}

function scoreBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Strong signals", color: ACCENT };
  if (score >= 60) return { label: "Room to improve", color: "#9a5b12" };
  return { label: "Gaps detected", color: "#b42318" };
}

function countBySeverity(findings: DiagnosticFinding[]) {
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const f of findings) {
    if (f.id === "perf.disclaimer") continue;
    counts[f.severity] += 1;
  }
  return counts;
}

function drawHeader(doc: PDFKit.PDFDocument, input: OpenAuditPdfInput): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const top = 36;

  drawRoundedRect(doc, left, top, width, 52, 10, PAGE_BG_BAND);
  doc
    .fillColor(ACCENT)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("MONEYGAP AI", left + 16, top + 14, { characterSpacing: 1.2 });
  doc
    .fillColor(FG)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Open Audit Report", left + 16, top + 28);

  const sourceLabel = input.source ? String(input.source) : "sandbox";
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(sourceLabel.toUpperCase(), left + 16, top + 14, {
      width: width - 32,
      align: "right",
    });

  doc.y = top + 68;
}

function drawScoreHero(
  doc: PDFKit.PDFDocument,
  input: OpenAuditPdfInput,
  created: string,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.y;
  const band = scoreBand(input.score);

  drawRoundedRect(doc, left, y, width, 108, 12, "#ffffff");
  doc
    .strokeColor(RULE)
    .lineWidth(1)
    .roundedRect(left, y, width, 108, 12)
    .stroke();

  // Left accent strip
  doc.save();
  doc.fillColor(ACCENT);
  doc.rect(left, y, 6, 108).fill();
  doc.restore();

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(9)
    .text("MoneyGap Score™", left + 20, y + 16);

  doc
    .fillColor(FG)
    .font("Helvetica-Bold")
    .fontSize(36)
    .text(`${input.score}`, left + 20, y + 32, { continued: true })
    .fontSize(14)
    .fillColor(MUTED)
    .text(" / 100");

  doc
    .fillColor(band.color)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(band.label, left + 20, y + 78);

  const rightCol = left + width * 0.42;
  doc
    .fillColor(FG)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(truncate(input.hostname, 42), rightCol, y + 20, {
      width: width - (rightCol - left) - 16,
    });

  if (input.url) {
    doc
      .fillColor(ACCENT)
      .font("Helvetica")
      .fontSize(8)
      .text(truncate(input.url, 64), rightCol, y + 42, {
        width: width - (rightCol - left) - 16,
        link: input.url,
      });
  }

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(`Generated ${created}`, rightCol, y + 78, {
      width: width - (rightCol - left) - 16,
    });

  doc.y = y + 124;
}

function drawSummaryChips(
  doc: PDFKit.PDFDocument,
  counts: ReturnType<typeof countBySeverity>,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const chipW = (width - 24) / 4;
  const y = doc.y;
  const entries: Array<[keyof typeof counts, string]> = [
    ["fail", "Failures"],
    ["warn", "Warnings"],
    ["pass", "Passes"],
    ["info", "Info"],
  ];

  entries.forEach(([key, label], i) => {
    const x = left + i * (chipW + 8);
    const colors = SEVERITY_COLORS[key];
    drawRoundedRect(doc, x, y, chipW, 48, 8, colors.bg);
    doc
      .fillColor(colors.fg)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(String(counts[key]), x + 10, y + 10, { width: chipW - 20 });
    doc
      .fillColor(colors.fg)
      .font("Helvetica")
      .fontSize(8)
      .text(label, x + 10, y + 30, { width: chipW - 20 });
  });

  doc.y = y + 64;
}

function drawFindingCard(
  doc: PDFKit.PDFDocument,
  finding: DiagnosticFinding,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const colors = SEVERITY_COLORS[finding.severity] ?? SEVERITY_COLORS.info;
  const title = truncate(finding.title, 88);
  const detail = truncate(finding.detail, 320);
  const category = truncate(finding.category, 28);

  doc.font("Helvetica-Bold").fontSize(10);
  const titleH = doc.heightOfString(title, { width: width - 88 });
  doc.font("Helvetica").fontSize(9);
  const detailH = doc.heightOfString(detail, { width: width - 28 });
  const cardH = Math.max(56, 28 + titleH + 8 + detailH + 12);

  ensureSpace(doc, cardH + 10);
  const y = doc.y;

  drawRoundedRect(doc, left, y, width, cardH, 8, "#ffffff");
  doc.strokeColor(RULE).lineWidth(0.8).roundedRect(left, y, width, cardH, 8).stroke();

  const pillW = 46;
  drawRoundedRect(doc, left + 10, y + 12, pillW, 16, 4, colors.bg);
  doc
    .fillColor(colors.fg)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(colors.label, left + 10, y + 15, {
      width: pillW,
      align: "center",
    });

  doc
    .fillColor(FG)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, left + 66, y + 12, { width: width - 88 });

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(7)
    .text(category.toUpperCase(), left + 66, y + 12 + titleH + 2);

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(9)
    .text(detail, left + 14, y + 12 + titleH + 16, {
      width: width - 28,
      lineGap: 1.5,
    });

  doc.y = y + cardH + 8;
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  origin: string,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const bottom = doc.page.height - 36;

  doc
    .strokeColor(RULE)
    .lineWidth(0.6)
    .moveTo(left, bottom - 14)
    .lineTo(left + width, bottom - 14)
    .stroke();

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(7)
    .text(
      "Free heuristics — not a full MoneyGap Engine™ report with Fix Paths™. AI Estimate framing — not legal, financial, or compliance advice.",
      left,
      bottom - 10,
      { width: width - 48, lineBreak: false },
    );

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(7)
    .text(`${pageNumber}`, left, bottom - 10, {
      width,
      align: "right",
    });

  void origin;
}

export function buildOpenAuditPdf(input: OpenAuditPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      bufferPages: true,
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

    const findings = input.findings
      .filter((f) => f.id !== "perf.disclaimer")
      .slice(0, 40);
    const counts = countBySeverity(findings);

    drawHeader(doc, input);
    drawScoreHero(doc, input, created);
    drawSummaryChips(doc, counts);

    doc
      .fillColor(FG)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Diagnostic findings", doc.page.margins.left, doc.y);

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "Crawlability · schema · performance signals from the free MoneyGap scan.",
        { width: contentWidth(doc) },
      );

    doc.moveDown(0.6);

    if (findings.length === 0) {
      doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("No findings.");
    } else {
      // Failures and warnings first for usefulness
      const ordered = [
        ...findings.filter((f) => f.severity === "fail"),
        ...findings.filter((f) => f.severity === "warn"),
        ...findings.filter((f) => f.severity === "info"),
        ...findings.filter((f) => f.severity === "pass"),
      ];
      for (const f of ordered) {
        drawFindingCard(doc, f);
      }
    }

    ensureSpace(doc, 90);
    const ctaY = doc.y + 8;
    const left = doc.page.margins.left;
    const width = contentWidth(doc);
    drawRoundedRect(doc, left, ctaY, width, 72, 10, ACCENT_SOFT);

    doc
      .fillColor(FG)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Unlock Fix Paths™", left + 16, ctaY + 14);

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Start a free trial for step-by-step Fix Paths™, Growth Digest™, and the full MoneyGap Engine™.",
        left + 16,
        ctaY + 32,
        { width: width - 32 },
      );

    const trialUrl = `${origin}/pricing`;
    doc
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Start Free Trial →", left + 16, ctaY + 52, {
        link: trialUrl,
        underline: true,
      });

    doc.y = ctaY + 88;

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      drawFooter(doc, i + 1, origin);
    }

    doc.end();
  });
}

export function auditPdfFilename(hostname: string, slug: string): string {
  const safeHost = hostname.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase() || "site";
  return `moneygap-${safeHost}-${slug}.pdf`;
}
