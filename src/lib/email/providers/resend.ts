import type { EmailMessage, EmailSendResult } from "@/lib/email/types";
import type { EmailProvider } from "@/lib/email/providers/types";
import { log } from "@/lib/observability/logger";

function defaultFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.CONTACT_FROM_EMAIL?.trim() ||
    "MoneyGap AI <onboarding@resend.dev>"
  );
}

export function createResendProvider(): EmailProvider {
  return {
    name: "resend",
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (!apiKey) {
        return {
          ok: false,
          provider: "resend",
          error: "RESEND_API_KEY is not configured.",
        };
      }

      const to = Array.isArray(message.to) ? message.to : [message.to];
      const attachments = message.attachments?.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string"
            ? a.content
            : a.content.toString("base64"),
        content_type: a.contentType,
      }));
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: defaultFrom(),
            to,
            subject: message.subject,
            text: message.text,
            html: message.html,
            reply_to: message.replyTo,
            headers: message.headers,
            tags: message.tags,
            ...(attachments?.length ? { attachments } : {}),
          }),
        });

        const body = (await res.json().catch(() => ({}))) as {
          id?: string;
          message?: string;
          error?: { message?: string };
        };

        if (!res.ok) {
          const error =
            body.error?.message ?? body.message ?? `Resend HTTP ${res.status}`;
          log("warn", "email_resend_failed", {
            status: res.status,
            error: error.slice(0, 200),
          });
          return { ok: false, provider: "resend", error };
        }

        return {
          ok: true,
          provider: "resend",
          providerMessageId: body.id,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log("warn", "email_resend_exception", { error: error.slice(0, 200) });
        return { ok: false, provider: "resend", error };
      }
    },
  };
}
