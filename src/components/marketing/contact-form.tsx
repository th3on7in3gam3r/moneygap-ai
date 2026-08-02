"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const INQUIRY_TYPES = [
  { value: "support", label: "Product support" },
  { value: "sales", label: "Sales inquiry" },
  { value: "partnership", label: "Partnership inquiry" },
] as const;

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(() => {
      void (async () => {
        setStatus("idle");
        setMessage(null);
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inquiryType: data.get("inquiryType"),
              name: data.get("name"),
              email: data.get("email"),
              message: data.get("message"),
            }),
          });
          const body = (await res.json()) as {
            ok?: boolean;
            message?: string;
            error?: string;
          };
          if (!res.ok || !body.ok) {
            setStatus("error");
            setMessage(body.error ?? "Could not send your message. Please email us directly.");
            return;
          }
          setStatus("ok");
          setMessage(body.message ?? "Thanks — we received your message.");
          form.reset();
        } catch {
          setStatus("error");
          setMessage("Could not send your message. Please email support@moneygap-ai.com.");
        }
      })();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="inquiryType" className="text-sm font-medium text-fg">
          Inquiry type
        </label>
        <select
          id="inquiryType"
          name="inquiryType"
          required
          className="mt-1.5 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-sm text-fg outline-none ring-accent focus:ring-2"
          defaultValue="support"
        >
          {INQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="name" className="text-sm font-medium text-fg">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          className="mt-1.5 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-sm text-fg outline-none ring-accent focus:ring-2"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-fg">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-sm text-fg outline-none ring-accent focus:ring-2"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium text-fg">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          className="mt-1.5 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-sm text-fg outline-none ring-accent focus:ring-2"
          placeholder="How can we help?"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send message"}
      </Button>
      {message ? (
        <p
          className={`text-sm ${status === "error" ? "text-danger" : "text-fg-muted"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
