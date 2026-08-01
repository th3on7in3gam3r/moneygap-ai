"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ANALYSIS_STAGES } from "@/lib/analysis/stages";
import { cn } from "@/lib/utils";

type StageState = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

type StatusPayload = {
  id: string;
  url: string;
  domain: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  progress: number;
  error: string | null;
  reportId: string | null;
  stages: StageState[];
};

export function AnalysisProgress({
  analysisId,
  onComplete,
  stayOnComplete = false,
  title = "Analyzing Website",
  eyebrow = "Website intelligence",
}: {
  analysisId: string;
  onComplete?: (reportId: string) => void;
  stayOnComplete?: boolean;
  title?: string;
  eyebrow?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/analysis/${analysisId}`, { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) {
            setPollError(body.error ?? "Unable to load analysis status.");
          }
          return;
        }
        const payload = (await res.json()) as StatusPayload;
        if (cancelled) return;
        setData(payload);
        setPollError(null);

        if (payload.status === "completed" && payload.reportId) {
          onComplete?.(payload.reportId);
          if (!stayOnComplete) {
            router.replace(`/reports/${payload.reportId}`);
          }
          return;
        }

        if (payload.status !== "failed") {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) {
          setPollError("Connection interrupted. Retrying…");
          timer = setTimeout(poll, 2000);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId, router, onComplete, stayOnComplete]);

  const stages =
    data?.stages ??
    ANALYSIS_STAGES.map((s, i) => ({
      id: s.id,
      label: s.label,
      done: false,
      active: i === 0,
    }));

  const progress = data?.progress ?? 4;
  const failed = data?.status === "failed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-fg-muted">
          {data?.url ?? "Preparing crawl…"}
        </p>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{failed ? "Analysis stopped" : data?.stage ?? "Queued"}</span>
              <span className="tabular-nums">{Math.min(progress, 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
              <motion.div
                className={cn("h-full rounded-full", failed ? "bg-danger" : "bg-accent")}
                initial={{ width: "4%" }}
                animate={{ width: `${Math.max(4, Math.min(progress, 100))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <ul className="space-y-3">
            {stages.map((stage, index) => (
              <motion.li
                key={stage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3.5 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  {stage.done || data?.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : stage.active && !failed ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : failed && stage.active ? (
                    <AlertCircle className="h-5 w-5 text-danger" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    stage.done || stage.active ? "text-fg" : "text-fg-subtle",
                  )}
                >
                  {stage.label}
                </span>
              </motion.li>
            ))}
          </ul>

          {pollError && !failed && (
            <p className="text-sm text-fg-muted">{pollError}</p>
          )}

          {failed && (
            <div className="space-y-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-4">
              <p className="text-sm leading-relaxed text-fg">
                {data?.error ??
                  "We couldn't analyze this website. Please confirm the URL is publicly accessible."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button href="/dashboard/analyze" variant="secondary" size="sm">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try another URL
                </Button>
                <Link
                  href={`/dashboard/analyze?url=${encodeURIComponent(data?.url ?? "")}`}
                  className="inline-flex h-9 items-center rounded-xl px-3.5 text-sm text-fg-muted hover:text-fg"
                >
                  Retry this site
                </Link>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
