"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Source = "extension_page" | "share" | "features" | "home" | "docs";

export function ExtensionWaitlistForm({
  source = "extension_page",
  className,
}: {
  source?: Source;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/extension/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Could not join the waitlist.");
          return;
        }
        setMessage(data.message ?? "You’re on the list.");
        setEmail("");
      })();
    });
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="extension-waitlist-email">
          Email
        </label>
        <input
          id="extension-waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle"
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Joining…" : "Notify me"}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-sm text-fg-muted" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
