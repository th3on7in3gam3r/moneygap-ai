"use client";

import { CheckCircle2, Copy, Loader2, Terminal, XCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { SANDBOX_STORAGE_KEY } from "@/lib/public-diagnostics/constants";
import type {
  DiagnosticFinding,
  LiveDiagnosticsResult,
  SandboxStoragePayload,
} from "@/lib/public-diagnostics/types";
import {
  commandLine,
  findingSummaryLines,
  runProgressiveStages,
  severityMark,
} from "@/components/marketing/sandbox-terminal-log";
import { cn } from "@/lib/utils";

type ScanState =
  | { status: "idle" }
  | { status: "running"; lines: string[] }
  | { status: "done"; result: LiveDiagnosticsResult; logLines: string[] }
  | {
      status: "error";
      message: string;
      result?: LiveDiagnosticsResult | null;
      logLines?: string[];
    };

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
  const [publishState, setPublishState] = useState<
    "idle" | "publishing" | "done" | "error"
  >("idle");
  const [publishHref, setPublishHref] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [pdfHref, setPdfHref] = useState<string | null>(null);
  const [reportEmail, setReportEmail] = useState("");
  const [emailState, setEmailState] = useState<
    "idle" | "sending" | "done" | "error"
  >("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelStagesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state]);

  useEffect(() => {
    return () => {
      cancelStagesRef.current?.();
    };
  }, []);

  function runScan() {
    const target = url.trim();
    if (!target) {
      setState({ status: "error", message: "Enter a website URL to scan." });
      return;
    }

    cancelStagesRef.current?.();

    const initialLines = [commandLine(target)];
    setState({ status: "running", lines: initialLines });
    setPublishState("idle");
    setPublishHref(null);
    setPublishError(null);
    setPdfHref(null);
    setEmailState("idle");
    setEmailMessage(null);

    cancelStagesRef.current = runProgressiveStages((line) => {
      setState((prev) => {
        if (prev.status !== "running") return prev;
        // Avoid duplicating the same “Working…” line
        if (line === "› Working…" && prev.lines[prev.lines.length - 1] === line) {
          return prev;
        }
        return { status: "running", lines: [...prev.lines, line] };
      });
    });

    startTransition(async () => {
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

        cancelStagesRef.current?.();
        cancelStagesRef.current = null;

        if (!res.ok || !data.result) {
          setState((prev) => {
            const baseLines =
              prev.status === "running" ? prev.lines : initialLines;
            const cleaned = baseLines.filter((l) => l !== "› Working…");
            return {
              status: "error",
              message: data.error ?? "Scan failed. Try another public URL.",
              result: data.result ?? null,
              logLines: [...cleaned, `✗ ${data.error ?? "Scan failed"}`],
            };
          });
          return;
        }

        persistSandbox(data.result);
        setUrl(data.result.url);
        const summaries = findingSummaryLines(data.result.findings);
        const scoreLine = `✓ Done — score ${data.result.score}/100 (${data.result.durationMs}ms)`;
        setState((prev) => {
          const baseLines =
            prev.status === "running" ? prev.lines : initialLines;
          const cleaned = baseLines.filter((l) => l !== "› Working…");
          return {
            status: "done",
            result: data.result!,
            logLines: [...cleaned, scoreLine, ...summaries],
          };
        });
      } catch {
        cancelStagesRef.current?.();
        cancelStagesRef.current = null;
        setState((prev) => ({
          status: "error",
          message: "Network error — check your connection and try again.",
          logLines:
            prev.status === "running"
              ? [...prev.lines.filter((l) => l !== "› Working…"), "✗ Network error"]
              : undefined,
        }));
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

  async function publishAudit() {
    if (state.status !== "done") return;
    setPublishState("publishing");
    setPublishError(null);
    try {
      const res = await fetch("/api/public/audit-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: state.result.url,
          score: state.result.score,
          findings: state.result.findings,
          durationMs: state.result.durationMs,
          source: "sandbox",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        href?: string;
        slug?: string;
        error?: string;
      };
      if (!res.ok || !data.href) {
        setPublishState("error");
        setPublishError(data.error ?? "Publish failed");
        return;
      }
      setPublishHref(data.href);
      if (data.slug) {
        setPdfHref(`/api/public/audits/${data.slug}/pdf`);
      }
      setPublishState("done");
    } catch {
      setPublishState("error");
      setPublishError("Network error publishing audit.");
    }
  }

  async function sendPdfReport() {
    if (state.status !== "done") return;
    const email = reportEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailState("error");
      setEmailMessage("Enter a valid email address.");
      return;
    }
    setEmailState("sending");
    setEmailMessage(null);
    try {
      const res = await fetch("/api/public/cli-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          url: state.result.url,
          score: state.result.score,
          findings: state.result.findings,
          durationMs: state.result.durationMs,
          source: "sandbox",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        href?: string;
        pdfHref?: string;
        emailed?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.href) {
        setEmailState("error");
        setEmailMessage(data.error ?? "Could not send report.");
        return;
      }
      setPublishHref(data.href);
      setPdfHref(data.pdfHref ?? null);
      setPublishState("done");
      setEmailState("done");
      setEmailMessage(
        data.emailed
          ? `Check ${email} for the PDF attachment.`
          : "Report published — email delivery soft-failed; use Download PDF below.",
      );
    } catch {
      setEmailState("error");
      setEmailMessage("Network error sending report.");
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

  const logLines =
    state.status === "running"
      ? state.lines
      : state.status === "done"
        ? state.logLines
        : state.status === "error"
          ? state.logLines
          : null;

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
            ref={logRef}
            className="max-h-[14rem] min-h-[11rem] overflow-y-auto rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 font-mono text-xs leading-relaxed sm:min-h-[13rem]"
            aria-live="polite"
          >
            {state.status === "idle" ? (
              <div className="space-y-2 text-white/45">
                <p>
                  <span className="text-accent/80">$</span> Enter a URL and press
                  Run
                  <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent/70 align-middle" />
                </p>
                <p>
                  Live crawlability, schema, and performance signals — same engine
                  as{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white/60">
                    npx moneygap-scan
                  </code>
                  .
                </p>
              </div>
            ) : null}

            {logLines ? (
              <ul className="space-y-1 text-white/70">
                {logLines.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
                {state.status === "running" ? (
                  <li className="text-accent/80" aria-hidden>
                    <span className="inline-block h-3 w-1.5 animate-pulse bg-accent/70" />
                  </li>
                ) : null}
              </ul>
            ) : null}

            {state.status === "error" && !result ? (
              <div className="mt-2 space-y-2 text-danger">
                <p className="inline-flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{state.message}</span>
                </p>
              </div>
            ) : null}

            {result && (state.status === "done" || state.status === "error") ? (
              <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                {state.status === "error" ? (
                  <p className="inline-flex items-start gap-2 text-danger">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{state.message}</span>
                  </p>
                ) : null}
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
                <button
                  type="button"
                  disabled={publishState === "publishing" || publishState === "done"}
                  onClick={() => void publishAudit()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-accent/40 px-4 text-sm text-accent transition hover:border-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  {publishState === "publishing"
                    ? "Publishing…"
                    : publishState === "done"
                      ? "Published"
                      : "Publish to Open Audits"}
                </button>
                {pdfHref ? (
                  <a
                    href={pdfHref}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Download PDF
                  </a>
                ) : null}
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-white/55">
                  Email yourself the visual PDF report (Open Audit + attachment).
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-accent/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendPdfReport();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={emailState === "sending" || emailState === "done"}
                    onClick={() => void sendPdfReport()}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg transition hover:brightness-110 disabled:opacity-50"
                  >
                    {emailState === "sending"
                      ? "Sending…"
                      : emailState === "done"
                        ? "Sent"
                        : "Send PDF report"}
                  </button>
                </div>
                {emailMessage ? (
                  <p
                    className={cn(
                      "text-xs",
                      emailState === "error" ? "text-danger" : "text-accent",
                    )}
                  >
                    {emailMessage}
                  </p>
                ) : null}
              </div>

              {publishState === "done" && publishHref ? (
                <p className="text-xs text-accent">
                  Public snapshot:{" "}
                  <a href={publishHref} className="underline hover:text-white">
                    {publishHref}
                  </a>
                </p>
              ) : null}
              {publishState === "error" && publishError ? (
                <p className="text-xs text-danger">{publishError}</p>
              ) : null}
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
