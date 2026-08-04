"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function CliPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/cli/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "cli_page" }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not join.");
      return;
    }
    setMessage(data.message ?? "You’re on the list.");
    setEmail("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-5 py-16 sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          MoneyGap CLI
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          CI/CD scans — coming soon
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">
          Join the waitlist for automated MoneyGap CLI scans in your deployment pipelines —
          weekly code updates and fix checklists for developers, not generic marketing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Try it today</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Live URL diagnostics ship now via{" "}
            <code className="rounded bg-bg-muted px-1.5 py-0.5 text-fg">
              npx moneygap-scan &lt;url&gt;
            </code>
          </p>
          <p>
            Full Fix Paths™ unlock after you{" "}
            <a href="/sign-up" className="font-medium text-accent hover:underline">
              Start free
            </a>
            .
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">CI/CD waitlist</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void join(e)} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11 flex-1 rounded-xl border border-border bg-bg px-3 text-sm"
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Joining…" : "Join waitlist"}
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
