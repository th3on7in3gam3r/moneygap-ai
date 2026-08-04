"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const ACTION_SNIPPET = `# .github/workflows/moneygap.yml
name: MoneyGap
on:
  pull_request:
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Live diagnostics
        run: npx --yes moneygap-scan@latest \${{ vars.PREVIEW_URL }}
`;

export default function CliPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(ACTION_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-5 py-16 sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          MoneyGap CLI
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Add a GitHub Action for growth regressions
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">
          Gate pull requests with{" "}
          <code className="rounded bg-bg-muted px-1.5 py-0.5 text-sm text-fg">
            npx moneygap-scan
          </code>{" "}
          — crawlability, schema, and performance signals. Exit code{" "}
          <code className="rounded bg-bg-muted px-1.5 py-0.5 text-sm text-fg">1</code>{" "}
          fails the check when critical findings appear.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Workflow snippet</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <pre className="overflow-x-auto rounded-xl border border-border bg-bg-muted p-4 font-mono text-xs leading-relaxed text-fg">
            {ACTION_SNIPPET}
          </pre>
          <Button type="button" variant="secondary" size="sm" onClick={() => void copySnippet()}>
            {copied ? "Copied" : "Copy workflow"}
          </Button>
          <p className="text-sm text-fg-muted">
            Set repository variable{" "}
            <code className="rounded bg-bg-muted px-1 py-0.5 text-fg">PREVIEW_URL</code> to your
            PR preview, or run{" "}
            <code className="rounded bg-bg-muted px-1 py-0.5 text-fg">moneygap scan</code> offline
            after <code className="rounded bg-bg-muted px-1 py-0.5 text-fg">moneygap init</code>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Try it locally</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            <code className="rounded bg-bg-muted px-1.5 py-0.5 text-fg">
              npx moneygap-scan https://example.com
            </code>
          </p>
          <p>
            Full Fix Paths™ unlock after you{" "}
            <a href="/sign-up" className="font-medium text-accent hover:underline">
              Start Free Trial
            </a>
            . Browse{" "}
            <a href="/labs" className="font-medium text-accent hover:underline">
              Open Audits
            </a>{" "}
            for public scan snapshots.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Managed CI / org policy waitlist
          </h2>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-fg-muted">
            Need org-wide policy, check runs, or hosted gates beyond the open Action? Join the
            waitlist — Developer Tips channel for future nurturing.
          </p>
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
