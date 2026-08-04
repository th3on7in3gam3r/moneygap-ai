import { createResendProvider } from "@/lib/email/providers/resend";
import type { EmailProvider } from "@/lib/email/providers/types";

export function getEmailProvider(): EmailProvider {
  const name = (process.env.EMAIL_PROVIDER ?? "resend").trim().toLowerCase();
  switch (name) {
    case "resend":
    default:
      return createResendProvider();
  }
}

export type { EmailProvider } from "@/lib/email/providers/types";
