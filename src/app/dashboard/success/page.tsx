"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

type Help = { id: string; title: string; body: string };

type Payload = {
  enabled: boolean;
  message: string | null;
  steps: Step[];
  progress: { done: number; total: number };
  help: Help[];
};

export default function CustomerSuccessPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => {
        void (async () => {
          try {
            const res = await fetch("/api/success/onboarding");
            const body = (await res.json()) as Payload & { error?: string };
            if (!res.ok) {
              setError(body.error ?? "Could not load onboarding");
              return;
            }
            setData(body);
          } catch {
            setError("Could not load onboarding");
          }
        })();
      });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Customer Success Center™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Get to first value
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Interactive onboarding, in-app help, and links to Academy and Docs.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setHelpOpen((v) => !v)}
          >
            {helpOpen ? "Hide help" : "In-app help"}
          </Button>
          <Button href="/dashboard/onboarding" size="sm" variant="secondary">
            Open onboarding
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                void (async () => {
                  await fetch("/api/onboarding", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "replay" }),
                  });
                  window.location.href = "/dashboard/onboarding";
                })();
              });
            }}
          >
            Replay onboarding
          </Button>
          <Button href="/dashboard/docs" size="sm" variant="secondary">
            Documentation
          </Button>
          <Button href="/dashboard/marketplace" size="sm" variant="secondary">
            Academy
          </Button>
          <Button href="/dashboard/reports" size="sm">
            View reports
          </Button>
        </div>
      </header>

      {pending && !data && (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Loading onboarding…
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      )}
      {data && !data.enabled && (
        <p className="text-sm text-fg-muted">{data.message}</p>
      )}

      {data?.enabled && (
        <>
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                Onboarding checklist
              </h2>
              <p className="text-xs text-fg-muted">
                {data.progress.done} / {data.progress.total} complete
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.steps.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {idx + 1}. {s.title}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">{s.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.done ? "accent" : "neutral"}>
                      {s.done ? "Done" : "Todo"}
                    </Badge>
                    <Button href={s.href} size="sm" variant="secondary">
                      Open
                    </Button>
                  </div>
                </div>
              ))}
              {data.steps.length === 0 && (
                <p className="text-sm text-fg-muted">No steps yet.</p>
              )}
            </CardBody>
          </Card>

          {helpOpen && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">Help</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {data.help.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border px-3 py-3 text-sm">
                    <p className="font-medium text-fg">{h.title}</p>
                    <p className="mt-1 text-fg-muted">{h.body}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}

      <p className="text-xs text-fg-muted">
        <Link href="/dashboard/launch" className="text-accent hover:underline">
          Launch Center
        </Link>
      </p>
    </div>
  );
}
