"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DiagnosticFinding, LiveDiagnosticsResult } from "@/lib/public-diagnostics";

type Side = {
  url: string;
  result: LiveDiagnosticsResult | null;
  error: string | null;
  slug: string | null;
};

export default function LabsComparePage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<Side | null>(null);
  const [right, setRight] = useState<Side | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  async function scanOne(url: string): Promise<Side> {
    const res = await fetch("/api/public/sandbox-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      result?: LiveDiagnosticsResult | null;
    };
    if (!res.ok || !data.result) {
      return { url, result: null, error: data.error ?? "Scan failed", slug: null };
    }
    return { url: data.result.url, result: data.result, error: null, slug: null };
  }

  async function runCompare() {
    setBusy(true);
    setPublishMsg(null);
    const [l, r] = await Promise.all([scanOne(a.trim()), scanOne(b.trim())]);
    setLeft(l);
    setRight(r);
    setBusy(false);
  }

  async function publishBoth() {
    if (!left?.result || !right?.result) return;
    setBusy(true);
    setPublishMsg(null);
    async function publish(result: LiveDiagnosticsResult, peer?: string) {
      const res = await fetch("/api/public/audit-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.url,
          score: result.score,
          findings: result.findings,
          durationMs: result.durationMs,
          source: "compare",
          comparePeerSlug: peer ?? null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; slug?: string; error?: string };
      if (!res.ok || !data.slug) throw new Error(data.error ?? "Publish failed");
      return data.slug;
    }
    try {
      const slugA = await publish(left.result);
      const slugB = await publish(right.result, slugA);
      setLeft((s) => (s ? { ...s, slug: slugA } : s));
      setRight((s) => (s ? { ...s, slug: slugB } : s));
      setPublishMsg(`Published — /labs/audits/${slugA} and /labs/audits/${slugB}`);
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : "Publish failed");
    }
    setBusy(false);
  }

  function Column({ side, label }: { side: Side | null; label: string }) {
    if (!side) {
      return (
        <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-fg-muted">
          {label} — awaiting scan
        </div>
      );
    }
    if (side.error || !side.result) {
      return (
        <div className="rounded-2xl border border-border p-5 text-sm text-danger">
          {label}: {side.error ?? "No result"}
        </div>
      );
    }
    const findings = side.result.findings.filter((f) => f.id !== "perf.disclaimer");
    return (
      <div className="rounded-2xl border border-border bg-bg p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {label}
        </p>
        <p className="mt-2 break-all text-sm font-medium text-fg">{side.result.url}</p>
        <p className="mt-2 text-2xl font-semibold text-fg">
          {side.result.score}
          <span className="text-base font-normal text-fg-muted"> / 100</span>
        </p>
        <ul className="mt-4 space-y-2 text-xs text-fg-muted">
          {findings.slice(0, 8).map((f: DiagnosticFinding) => (
            <li key={f.id}>
              <span className="text-fg">[{f.severity}]</span> {f.title}
            </li>
          ))}
        </ul>
        {side.slug ? (
          <Link
            href={`/labs/audits/${side.slug}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Open Audit →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
        Labs
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Compare two public URLs
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-fg-muted">
        Dual free sandbox scans (same rate limits). Optional publish to Open Audits.
        Scores are heuristics — AI Estimate framing for business impact, not guarantees.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <input
          type="url"
          placeholder="https://site-a.com"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-11 rounded-xl border border-border bg-bg px-3 text-sm"
        />
        <input
          type="url"
          placeholder="https://site-b.com"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-11 rounded-xl border border-border bg-bg px-3 text-sm"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !a.trim() || !b.trim()}
          onClick={() => void runCompare()}
        >
          {busy ? "Scanning…" : "Compare"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !left?.result || !right?.result}
          onClick={() => void publishBoth()}
        >
          Publish both to Open Audits
        </Button>
        <Button href="/labs" variant="secondary">
          Labs hub
        </Button>
      </div>
      {publishMsg ? <p className="mt-3 text-sm text-fg-muted">{publishMsg}</p> : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Column side={left} label="A" />
        <Column side={right} label="B" />
      </div>
    </div>
  );
}
