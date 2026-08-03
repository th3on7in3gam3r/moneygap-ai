"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

type Doc = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  href: string;
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "start", label: "Getting started" },
  { id: "product", label: "Product" },
  { id: "privacy", label: "Privacy" },
  { id: "platform", label: "Platform" },
  { id: "grow", label: "Grow" },
];

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
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Documentation Center™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Knowledge base
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          The same public MoneyGap guides as{" "}
          <Link href="/docs" className="text-accent hover:underline">
            /docs
          </Link>
          — getting started, scores, Fix Paths™, privacy, and Academy.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((c) => (
          <Button
            key={c.id || "all"}
            type="button"
            size="sm"
            variant={category === c.id ? "primary" : "secondary"}
            onClick={() => {
              setCategory(c.id);
              load(c.id || undefined);
            }}
          >
            {c.label}
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{d.title}</h2>
                  <Badge tone="neutral">{d.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-fg-muted">{d.summary}</p>
              </div>
              <Button href={d.href} size="sm" variant="secondary">
                Open guide
              </Button>
            </CardBody>
          </Card>
        ))}
        {enabled && docs.length === 0 && !pending && (
          <p className="text-sm text-fg-muted">No documents in this category.</p>
        )}
      </div>

      <p className="text-xs text-fg-muted">
        <Link href="/docs" className="text-accent hover:underline">
          Public documentation
        </Link>
        {" · "}
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
