"use client";

import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  websiteUrl?: string | null;
  websiteName?: string | null;
  websiteDomain?: string | null;
};

export function AnalyticsAnalyzeActions({
  websiteUrl,
  websiteName,
  websiteDomain,
}: Props) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function rerun() {
    if (!websiteUrl || rerunning) return;
    setError(null);
    setRerunning(true);
    setOpen(false);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const data = (await res.json()) as {
        analysisId?: string;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.analysisId) {
        setError(data.error ?? "Could not restart analysis.");
        setRerunning(false);
        return;
      }
      router.push(data.redirectTo ?? `/dashboard/analyze/${data.analysisId}`);
    } catch {
      setError("Could not restart analysis.");
      setRerunning(false);
    }
  }

  if (!websiteUrl) {
    return (
      <Button href="/dashboard/analyze" size="sm">
        Analyze website
      </Button>
    );
  }

  const label = websiteDomain || websiteName || "this site";

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        disabled={rerunning}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {rerunning ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Starting…
          </>
        ) : (
          <>
            Analyze website
            <ChevronDown className="size-3.5 opacity-80" />
          </>
        )}
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-[var(--shadow)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-bg-muted"
            onClick={() => void rerun()}
          >
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              <span className="block text-sm font-medium text-fg">
                Rerun analysis
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted">
                Re-scan {label} and refresh scores for this property.
              </span>
            </span>
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-bg-muted"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/analyze");
            }}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              <span className="block text-sm font-medium text-fg">
                Analyze a new website
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted">
                Open Analyze to enter a different URL.
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
