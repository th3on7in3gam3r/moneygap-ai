"use client";

import { useMemo, useState } from "react";
import type { UsageSummary } from "@/components/developers/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Band = "all" | "2xx" | "4xx" | "5xx";

export function LogsPanel({ summary }: { summary: UsageSummary | null }) {
  const [band, setBand] = useState<Band>("all");
  const rows = summary?.recentRequests ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (band === "all") return true;
      if (band === "2xx") return r.statusCode >= 200 && r.statusCode < 300;
      if (band === "4xx") return r.statusCode >= 400 && r.statusCode < 500;
      return r.statusCode >= 500;
    });
  }, [band, rows]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">Request log</h2>
        <div className="flex flex-wrap gap-1">
          {(["all", "2xx", "4xx", "5xx"] as Band[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBand(b)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                band === b
                  ? "bg-accent-soft text-accent"
                  : "text-fg-muted hover:bg-bg-muted"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="space-y-2">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-xs last:border-0"
          >
            <span className="font-mono text-fg">
              {r.method} {r.path}
            </span>
            <span className="text-fg-muted">
              {r.statusCode}
              {r.errorCode ? ` · ${r.errorCode}` : ""}
              {r.durationMs != null ? ` · ${r.durationMs}ms` : ""} ·{" "}
              {new Date(r.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-fg-muted">
            {rows.length === 0
              ? "No API requests logged yet."
              : "No requests match this filter."}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
