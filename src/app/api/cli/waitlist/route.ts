import { z } from "zod";
import { db } from "@/db";
import { cliCicdWaitlist } from "@/db/schema";
import { sendEmail } from "@/lib/email/services/send";
import { renderCliWaitlistConfirm } from "@/lib/email/templates/cli-waitlist";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().max(200),
  source: z
    .enum(["cli_page", "docs", "home", "developers"])
    .optional()
    .default("cli_page"),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source;

  try {
    await db.insert(cliCicdWaitlist).values({ email, source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(msg)) {
      return Response.json({
        ok: true,
        alreadySubscribed: true,
        message: "You’re already on the CLI CI/CD waitlist.",
      });
    }
    log("warn", "cli_waitlist_insert_failed", { error: msg.slice(0, 200) });
    return Response.json(
      { ok: false, error: "Could not join the waitlist. Try again shortly." },
      { status: 500 },
    );
  }

  const confirm = renderCliWaitlistConfirm(email);
  await sendEmail({
    to: email,
    subject: confirm.subject,
    html: confirm.html,
    text: confirm.text,
  });

  await sendEmail({
    to: "support@moneygap-ai.com",
    subject: `[CLI CI waitlist] ${email}`,
    text: `New CLI CI/CD waitlist signup\nEmail: ${email}\nSource: ${source}`,
  });

  log("info", "cli_waitlist_joined", { email, source });
  return Response.json({
    ok: true,
    alreadySubscribed: false,
    message: "You’re on the list — check your inbox for a confirmation.",
  });
}
