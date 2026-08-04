import { z } from "zod";
import { db } from "@/db";
import { extensionWaitlist } from "@/db/schema";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().max(200),
  source: z
    .enum(["extension_page", "share", "features", "home", "docs"])
    .optional()
    .default("extension_page"),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source;

  try {
    await db.insert(extensionWaitlist).values({ email, source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Unique violation → soft-success (already on list)
    if (/unique|duplicate/i.test(msg)) {
      log("info", "extension_waitlist_duplicate", { email, source });
      return Response.json({
        ok: true,
        alreadySubscribed: true,
        message: "You’re already on the list — we’ll email you when the extension ships.",
      });
    }
    log("warn", "extension_waitlist_insert_failed", { error: msg.slice(0, 200) });
    return Response.json(
      { ok: false, error: "Could not join the waitlist. Try again shortly." },
      { status: 500 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.CONTACT_FROM_EMAIL?.trim() ||
            "MoneyGap AI <onboarding@resend.dev>",
          to: ["support@moneygap-ai.com"],
          subject: `[Extension waitlist] ${email}`,
          text: `New browser extension waitlist signup\nEmail: ${email}\nSource: ${source}`,
        }),
      });
    } catch (err) {
      log("warn", "extension_waitlist_notify_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log("info", "extension_waitlist_joined", { email, source });
  return Response.json({
    ok: true,
    alreadySubscribed: false,
    message: "You’re on the list. We’ll notify you when the Chrome extension is ready.",
  });
}
