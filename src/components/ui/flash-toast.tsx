"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlashToastTone = "success" | "error" | "info";

export type FlashToastState = {
  id: number;
  message: string;
  tone: FlashToastTone;
  href?: string;
  hrefLabel?: string;
} | null;

type Props = {
  toast: FlashToastState;
  onDismiss: () => void;
  /** Auto-hide after ms. Errors stay longer. */
  durationMs?: number;
};

export function FlashToast({ toast, onDismiss, durationMs }: Props) {
  useEffect(() => {
    if (!toast) return;
    const ms =
      durationMs ??
      (toast.tone === "error" ? 5200 : toast.tone === "success" ? 3400 : 3000);
    const t = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const Icon = toast.tone === "error" ? XCircle : CheckCircle2;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 sm:bottom-8 sm:justify-end sm:px-6"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow)]",
          "animate-rise",
          toast.tone === "error"
            ? "border-danger/30 bg-bg-elevated text-fg"
            : "border-accent/35 bg-bg-elevated text-fg",
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            toast.tone === "error" ? "text-danger" : "text-accent",
          )}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm leading-snug font-medium">{toast.message}</p>
          {toast.href ? (
            <a
              href={toast.href}
              className="inline-flex text-xs font-semibold text-accent hover:underline"
            >
              {toast.hrefLabel ?? "View details →"}
            </a>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-lg p-1 text-fg-subtle transition hover:bg-bg-muted hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

let toastSeq = 0;

export function makeFlashToast(
  message: string,
  tone: FlashToastTone = "success",
  extras?: { href?: string; hrefLabel?: string },
): NonNullable<FlashToastState> {
  toastSeq += 1;
  return {
    id: toastSeq,
    message,
    tone,
    href: extras?.href,
    hrefLabel: extras?.hrefLabel,
  };
}
