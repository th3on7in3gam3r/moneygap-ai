import { getEmailProvider } from "@/lib/email/providers";
import type { EmailMessage, EmailSendResult } from "@/lib/email/types";

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  return provider.send(message);
}

export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "https://moneygap-ai.com"
  );
}
