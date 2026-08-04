import { getEmailProvider } from "@/lib/email/providers";
import type { EmailMessage, EmailSendResult } from "@/lib/email/types";
import { getSiteOrigin } from "@/lib/seo/site";

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  return provider.send(message);
}

/** Canonical public origin for email CTAs (skips localhost on Vercel Production). */
export function siteOrigin(): string {
  return getSiteOrigin();
}
