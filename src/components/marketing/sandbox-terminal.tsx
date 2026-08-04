"use client";

import { CheckCircle2, Copy, Loader2, Terminal, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import {
  SANDBOX_STORAGE_KEY,
  type DiagnosticFinding,
  type LiveDiagnosticsResult,
  type SandboxStoragePayload,
} from "@/lib/public-diagnostics";
import { cn } from "@/lib/utils";

type ScanState =
  | { status: "idle" }
  | { status: "running"; lines: string[] }
  | { status: "done"; result: LiveDiagnosticsResult }
  | { status: "error"; message: string; result?: LiveDiagnosticsResult | null };

function severityClass(severity: DiagnosticFinding["severity"]): string {
  switch (severity) {
    case "pass":
      return "text-accent";
    case "warn":
      return "text-gap";
    case "fail":
      return "text-danger";
    default:
      return "text-fg-muted";
  }
}

function severityMark(severity: DiagnosticFinding["severity"]): string {
  switch (severity) {
    case "pass":
      return "✓";
    case "warn":
      return "!";
    case "fail":
      return "✗";
    default:
      return "·";
  }
}

function persistSandbox(result: LiveDiagnosticsResult) {
  const payload: SandboxStoragePayload = {
    url: result.url,
    score: result.score,
    findingIds: result.findings.map((f) => f.id),
    ts: Date.now(),
  };
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function SandboxTerminal({ className }: { className?: string }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  function runScan() {
    const target = url.trim();
    if (!target) {
      setState({ status: "error", message: "Enter a website URL to scan." });
      return;
    }

    startTransition(async () => {
      setState({
        status: "running",
        lines: [
          `$ moneygap-scan ${target}`,
          "› Fetching page…",
          "› Checking crawlability…",
          "› Validating schema…",
          "› Performance signals…",
        ],
      });

      try {
        const res = await fetch("/api/public/sandbox-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          result?: LiveDiagnosticsResult | null;
        };

        if (!res.ok || !data.result) {
          setState({
            status: "error",
            message: data.error ?? "Scan failed. Try another public URL.",
            result: data.result ?? null,
          });
          return;
        }

        persistSandbox(data.result);
        setState({ status: "done", result: data.result });
        setUrl(data.result.url);
      } catch {
        setState({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    });
  }

  async function copyCli() {
    const target =
      (state.status === "done" ? state.result.url : url.trim()) ||
      "https://example.com";
    const cmd = `npx moneygap-scan ${target}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
    } catch {
      /* ignore */
    }
  }

  const result =
    state.status === "done"
      ? state.result
      : state.status === "error"
        ? state.result
        : null;

  const findings =
    result?.findings.filter((f) => f.id !== "perf.disclaimer").slice(0, 8) ?? [];

  return (
    <div className={cn("relative", className)}>
      <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl dark:bg-accent/5" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-[#0c1210] text-[#e8f0eb] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-gap/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
            <Terminal className="h-3.5 w-3.5" />
            Free sandbox · no account
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <label className="block space-y-2">
            <span className="font-mono text-xs text-accent/90">
              moneygap-scan ›
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://your-site.com"
                value={url}
                disabled={pending || state.status === "running"}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runScan();
                }}
                className="h-11 w-full flex-1 rounded-xl border border-white/15 bg-black/40 px-3.5 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-accent/60 focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
              />
              <Button
                type="button"
                size="md"
                className="h-11 shrink-0 sm:w-auto"
                disabled={pending || state.status === "running" || !url.trim()}
                onClick={runScan}
              >
                {pending || state.status === "running" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  "Run free scan"
                )}
              </Button>
            </div>
          </label>

          <div
            className="min-h-[11rem] rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 font-mono text-xs leading-relaxed sm:min-h-[13rem]"
            aria-live="polite"
          >
            {state.status === "idle" ? (
              <p className="text-white/45">
                Paste a public URL. We check crawlability, schema, and performance
                signals — then unlock Fix Paths™ with a free account.
              </p>
            ) : null}

            {state.status === "running" ? (
              <ul className="space-y-1 text-white/70">
                {state.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}

            {state.status === "error" ? (
              <div className="space-y-2 text-danger">
                <p className="inline-flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{state.message}</span>
                </p>
              </div>
            ) : null}

            {result && (state.status === "done" || state.status === "error") ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    Score{" "}
                    <span className="text-accent">{result.score}</span>
                    <span className="text-white/40"> / 100</span>
                  </p>
                  <p className="text-[11px] text-white/40">
                    {result.durationMs}ms
                    {result.meta.title ? ` · ${result.meta.title}` : ""}
                  </p>
                </div>
                <ul className="space-y-2">
                  {findings.map((f) => (
                    <li key={f.id} className="flex gap-2">
                      <span className={cn("shrink-0", severityClass(f.severity))}>
                        {severityMark(f.severity)}
                      </span>
                      <span>
                        <span className="text-white/90">{f.title}</span>
                        <span className="mt-0.5 block text-white/45">{f.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {state.status === "done" ? (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-xs leading-relaxed text-white/55">
                Free sandbox shows <span className="text-white/80">what</span> is
                leaking — Fix Paths™ and the full MoneyGap Engine™ unlock after you
                start free.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <StartFreeButton
                  label="Unlock Fix Paths™"
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                  forceRedirectUrl="/dashboard/analyze"
                />
                <button
                  type="button"
                  onClick={() => void copyCli()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy npx moneygap-scan"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-white/40">
              Same engine as{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/60">
                npx moneygap-scan &lt;url&gt;
              </code>
              . Not a full AI report.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
