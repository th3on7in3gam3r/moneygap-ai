"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RotateCcw,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StageCard = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
  status?: string;
  durationMs?: number | null;
  attempt?: number;
  errorMessage?: string | null;
};

type ScanEnginePayload = {
  scanEngine: "v3";
  scanJobId: string;
  jobStatus: string;
  currentStage: string | null;
  profile: string;
  progress: number;
  workerPresence: string;
  workerId: string | null;
  lastHeartbeatAt: string | null;
  errorClass: string | null;
  errorMessage: string | null;
  stages: Array<{
    id: string;
    label: string;
    status: string;
    durationMs: number | null;
    attempt: number;
    errorMessage: string | null;
    leaseExpiresAt: string | null;
    heartbeatAt: string | null;
  }>;
  diagnostics: Record<string, unknown>;
};

type StatusPayload = {
  id: string;
  url: string;
  domain: string;
  status: string;
  stage: string;
  progress: number;
  error: string | null;
  reportId: string | null;
  scanProfile: string | null;
  pagesCompleted: number;
  pagesDiscovered: number;
  scanEngine: ScanEnginePayload | null;
  stages: StageCard[];
};

function presenceLabel(p: string | undefined): string {
  switch (p) {
    case "processing":
      return "Processing";
    case "waiting_for_worker":
      return "Waiting for worker";
    case "recovering":
      return "Recovering";
    case "done":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return "Queued";
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function ScanCommandCenter({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showDiag, setShowDiag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/analysis/${scanId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError("Could not load scan status.");
          return;
        }
        const json = (await res.json()) as StatusPayload;
        if (cancelled) return;
        setData(json);
        setLoadError(null);

        if (json.status === "completed" && json.reportId) {
          router.replace(`/reports/${json.reportId}`);
          return;
        }
        if (json.status === "failed" || json.status === "completed") return;

        timer = setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setLoadError("Could not load scan status.");
        timer = setTimeout(poll, 4000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId, router]);

  async function stopScan() {
    setStopping(true);
    try {
      await fetch(`/api/analysis/${scanId}/cancel`, { method: "POST" });
      const res = await fetch(`/api/analysis/${scanId}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as StatusPayload);
    } finally {
      setStopping(false);
    }
  }

  async function resumeScan() {
    setResuming(true);
    try {
      await fetch(`/api/analysis/${scanId}/resume`, { method: "POST" });
      const res = await fetch(`/api/analysis/${scanId}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as StatusPayload);
    } finally {
      setResuming(false);
    }
  }

  const engine = data?.scanEngine;
  const progress = data?.progress ?? 0;
  const running =
    data?.status === "running" || data?.status === "queued";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Scan Command Center
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {data?.domain ?? "Scan in progress"}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {data?.url ?? "Loading…"}
          {data?.scanProfile ? (
            <span className="text-fg-subtle"> · {data.scanProfile} profile</span>
          ) : null}
        </p>
      </div>

      {loadError ? (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="size-4" />
          {loadError}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium text-fg">
            {presenceLabel(engine?.workerPresence)}
            {data?.stage ? (
              <span className="font-normal text-fg-muted"> — {data.stage}</span>
            ) : null}
          </p>
          <p className="text-sm tabular-nums text-fg-muted">{progress}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>
        {data ? (
          <p className="text-xs text-fg-subtle">
            {data.pagesCompleted} / {data.pagesDiscovered || "—"} pages captured
          </p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {(data?.stages ?? []).map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "flex items-center justify-between gap-3 border-b border-border/60 py-3",
              s.active && "text-fg",
              !s.active && !s.done && "text-fg-subtle",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {s.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : s.active ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-accent" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-border" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.label}</p>
                {s.errorMessage ? (
                  <p className="truncate text-xs text-danger">{s.errorMessage}</p>
                ) : s.status === "skipped" ? (
                  <p className="text-xs text-fg-subtle">Skipped for this profile</p>
                ) : null}
              </div>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-fg-subtle">
              {formatDuration(s.durationMs)}
              {s.attempt && s.attempt > 1 ? ` · try ${s.attempt}` : ""}
            </p>
          </motion.li>
        ))}
      </ul>

      {data?.error ? (
        <div className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {data.error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {running ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void stopScan()}
            disabled={stopping}
          >
            <Square className="size-3.5" />
            {stopping ? "Stopping…" : "Stop scan"}
          </Button>
        ) : null}
        {data?.status === "failed" || engine?.workerPresence === "recovering" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void resumeScan()}
            disabled={resuming}
          >
            <RotateCcw className="size-3.5" />
            {resuming ? "Resuming…" : "Resume"}
          </Button>
        ) : null}
        <Button href="/dashboard/analyze" variant="secondary" size="sm">
          New scan
        </Button>
        {data?.reportId ? (
          <Button href={`/reports/${data.reportId}`} size="sm">
            Open report
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          className="flex items-center gap-2 text-xs font-medium text-fg-muted hover:text-fg"
          onClick={() => setShowDiag((v) => !v)}
        >
          <ChevronDown
            className={cn("size-3.5 transition", showDiag && "rotate-180")}
          />
          Diagnostics
        </button>
        {showDiag && engine ? (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-muted p-3 text-[11px] leading-relaxed text-fg-muted">
            {JSON.stringify(
              {
                scanId,
                scanJobId: engine.scanJobId,
                workerId: engine.workerId,
                jobStatus: engine.jobStatus,
                currentStage: engine.currentStage,
                lastHeartbeatAt: engine.lastHeartbeatAt,
                workerPresence: engine.workerPresence,
                errorClass: engine.errorClass,
                errorMessage: engine.errorMessage,
              },
              null,
              2,
            )}
          </pre>
        ) : null}
        {!engine && showDiag ? (
          <p className="mt-2 text-xs text-fg-subtle">
            Legacy scan — open{" "}
            <Link className="underline" href={`/dashboard/analyze/${scanId}`}>
              classic progress
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
