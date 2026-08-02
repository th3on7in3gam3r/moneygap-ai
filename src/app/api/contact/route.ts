import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

type ContactBody = {
  inquiryType?: string;
  name?: string;
  email?: string;
  message?: string;
};

const ALLOWED = new Set(["support", "sales", "partnership"]);

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  let body: ContactBody = {};
  try {
    body = (await req.json()) as ContactBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const inquiryType = String(body.inquiryType ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const message = String(body.message ?? "").trim();

  if (!ALLOWED.has(inquiryType)) {
    return Response.json({ ok: false, error: "Choose a valid inquiry type." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 120) {
    return Response.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email) || email.length > 200) {
    return Response.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (message.length < 10 || message.length > 4000) {
    return Response.json(
      { ok: false, error: "Message should be at least 10 characters." },
      { status: 400 },
    );
  }

  const to = "support@moneygap-ai.com";
  const subject = `[MoneyGap Contact] ${inquiryType} — ${name}`;
  const text = [
    `Inquiry: ${inquiryType}`,
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  let emailed = false;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM_EMAIL?.trim() || "MoneyGap AI <onboarding@resend.dev>",
          to: [to],
          reply_to: email,
          subject,
          text,
        }),
      });
      emailed = res.ok;
      if (!res.ok) {
        const detail = await res.text();
        log("warn", "contact_email_failed", { status: res.status, detail: detail.slice(0, 200) });
      }
    } catch (err) {
      log("warn", "contact_email_error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log("info", "contact_inquiry_received", {
    inquiryType,
    email,
    emailed,
  });

  return Response.json({
    ok: true,
    emailed,
    message: emailed
      ? "Thanks — your message was sent. We typically reply within 1–2 business days."
      : "Thanks — we received your message. We typically reply within 1–2 business days. You can also email support@moneygap-ai.com or hello@moneygap-ai.com directly.",
  });
}
