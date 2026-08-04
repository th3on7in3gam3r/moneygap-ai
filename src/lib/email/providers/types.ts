import type { EmailMessage, EmailSendResult } from "@/lib/email/types";

export type EmailProvider = {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
};
