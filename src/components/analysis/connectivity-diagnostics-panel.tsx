"use client";

import type { ConnectivityDiagnostics } from "@/lib/scan/connectivity/types";
import { cn } from "@/lib/utils";

export function ConnectivityDiagnosticsPanel({
  diagnostics,
  defaultOpen = false,
}: {
  diagnostics: ConnectivityDiagnostics;
  defaultOpen?: boolean;
}) {
  const stages = diagnostics.technical?.stages ?? [];
  const rows: Array<{ label: string; value: string }> = [
    { label: "DNS", value: diagnostics.dns },
    { label: "TCP", value: diagnostics.tcp },
    { label: "TLS", value: diagnostics.tls },
    { label: "Redirect", value: diagnostics.redirect ?? "—" },
    { label: "Homepage", value: diagnostics.homepage },
    { label: "robots.txt", value: diagnostics.robots },
    { label: "sitemap", value: diagnostics.sitemap },
    {
      label: "Framework",
      value: diagnostics.detectedFramework ?? "unknown",
    },
    {
      label: "Est. pages",
      value:
        diagnostics.estimatedPages != null
          ? String(diagnostics.estimatedPages)
          : "—",
    },
  ];

  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-border bg-bg px-3.5 py-3"
    >
      <summary className="cursor-pointer text-xs font-semibold text-fg">
        Technical details
      </summary>
      <div className="mt-3 space-y-2">
        <dl className="grid gap-1.5 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-fg-subtle">{row.label}</dt>
              <dd
                className={cn(
                  "max-w-[65%] truncate text-right tabular-nums text-fg",
                  row.value.startsWith("fail") ||
                    row.value === "404" ||
                    /^[45]\d\d$/.test(row.value)
                    ? "text-danger"
                    : null,
                )}
                title={row.value}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {diagnostics.errors.length > 0 ? (
          <ul className="space-y-1 border-t border-border pt-2 text-xs text-danger">
            {diagnostics.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        {diagnostics.warnings.length > 0 ? (
          <ul className="space-y-1 border-t border-border pt-2 text-xs text-fg-muted">
            {diagnostics.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        {stages.length > 0 ? (
          <ul className="space-y-1 border-t border-border pt-2 text-[11px] text-fg-subtle">
            {stages.map((s) => (
              <li key={`${s.id}-${s.detail}`} className="flex justify-between gap-2">
                <span>
                  {s.id} · {s.status}
                </span>
                <span className="truncate tabular-nums" title={s.detail}>
                  {s.detail}
                  {s.elapsedMs ? ` · ${s.elapsedMs}ms` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
