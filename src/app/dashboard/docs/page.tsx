"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Doc = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  path: string;
};

export default function DocumentationCenterPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function load(cat?: string) {
    startTransition(() => {
      void (async () => {
        const params = cat ? `?category=${encodeURIComponent(cat)}` : "";
        const res = await fetch(`/api/docs/catalog${params}`);
        const data = (await res.json()) as {
          enabled?: boolean;
          message?: string;
          docs?: Doc[];
        };
        setEnabled(data.enabled !== false);
        setMessage(data.message ?? null);
        setDocs(data.docs ?? []);
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Documentation Center™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Knowledge base
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Curated index of MoneyGap docs for launch, security, API, and growth.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["", "product", "platform", "security", "grow"].map((c) => (
          <Button
            key={c || "all"}
            type="button"
            size="sm"
            variant={category === c ? "primary" : "secondary"}
            onClick={() => {
              setCategory(c);
              load(c || undefined);
            }}
          >
            {c || "all"}
          </Button>
        ))}
      </div>

      {pending && docs.length === 0 && (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Loading docs…
        </p>
      )}
      {!enabled && (
        <p className="text-sm text-fg-muted">{message}</p>
      )}

      <div className="space-y-3">
        {docs.map((d) => (
          <Card key={d.slug}>
            <CardBody className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{d.title}</h2>
                  <Badge tone="neutral">{d.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-fg-muted">{d.summary}</p>
                <p className="mt-2 text-xs text-fg-subtle">{d.path}</p>
              </div>
            </CardBody>
          </Card>
        ))}
        {enabled && docs.length === 0 && !pending && (
          <p className="text-sm text-fg-muted">No documents in this category.</p>
        )}
      </div>

      <p className="text-xs text-fg-muted">
        <Link href="/dashboard/success" className="text-accent hover:underline">
          Customer Success
        </Link>
        {" · "}
        <Link href="/dashboard/developers" className="text-accent hover:underline">
          Developer Hub
        </Link>
      </p>
    </div>
  );
}
