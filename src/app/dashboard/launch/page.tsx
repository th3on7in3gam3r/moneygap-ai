"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Check = {
  id: string;
  title: string;
  category: string;
  status: "pass" | "fail" | "manual" | "warn";
  detail: string;
  probeable: boolean;
  acked: boolean;
};

type Payload = {
  enabled: boolean;
  message: string | null;
  checks: Check[];
  summary: {
    pass: number;
    fail: number;
    warn: number;
    manual: number;
    acked: number;
  };
};

function tone(status: Check["status"]) {
  if (status === "pass") return "accent" as const;
  if (status === "fail") return "neutral" as const;
  return "neutral" as const;
}

export default function LaunchCenterPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/launch/status");
          const body = (await res.json()) as Payload & { error?: string };
          if (!res.ok) {
            setError(body.error ?? "Could not load launch status");
            return;
          }
          setData(body);
          setError(null);
        } catch {
          setError("Could not load launch status");
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  function ack(checkId: string) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/launch/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkId }),
        });
        load();
      })();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Launch Center™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Production readiness
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Live probes plus manual acknowledgements from the production checklist.
          Soft-fail surfaces never block Engine analysis.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard/system" size="sm" variant="secondary">
            Operations
          </Button>
          <Button href="/dashboard/docs" size="sm" variant="secondary">
            Docs
          </Button>
          <Button href="/dashboard/billing" size="sm" variant="secondary">
            Billing
          </Button>
        </div>
      </header>

      {pending && !data && (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Loading checklist…
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
          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["Pass", data.summary.pass],
                ["Fail", data.summary.fail],
                ["Warn", data.summary.warn],
                ["Acked", data.summary.acked],
              ] as const
            ).map(([label, n]) => (
              <Card key={label}>
                <CardBody className="py-4">
                  <p className="text-xs text-fg-subtle">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{n}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            {data.checks.map((c) => (
              <Card key={c.id}>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-fg">{c.title}</p>
                      <Badge tone={tone(c.status)}>{c.status}</Badge>
                      <span className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
                        {c.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">{c.detail}</p>
                  </div>
                  <div className="flex gap-2">
                    {c.acked ? (
                      <Badge tone="accent">Acknowledged</Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => ack(c.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
            {data.checks.length === 0 && (
              <p className="text-sm text-fg-muted">No checks available.</p>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-fg-muted">
        <Link href="/dashboard/success" className="text-accent hover:underline">
          Customer Success
        </Link>
        {" · "}
        See docs/operations.md and docs/production-checklist.md
      </p>
    </div>
  );
}
