"use client";

import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Registers the MoneyGap service worker and surfaces a non-blocking
 * update prompt. Never auto-reloads while the user is working.
 *
 * Enabled in production by default. Opt out with NEXT_PUBLIC_PWA_ENABLED=false.
 * Opt in during local testing with NEXT_PUBLIC_PWA_ENABLED=true.
 */
function pwaEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_PWA_ENABLED;
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.NODE_ENV === "production";
}

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!pwaEnabled()) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;
    let updateInterval: number | undefined;

    const onUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller &&
          !cancelled
        ) {
          setWaitingWorker(registration?.waiting ?? installing);
        }
      });
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
        }
        reg.addEventListener("updatefound", onUpdateFound);
        updateInterval = window.setInterval(() => {
          void reg.update().catch(() => undefined);
        }, 60 * 60 * 1000);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (updateInterval) window.clearInterval(updateInterval);
      registration?.removeEventListener("updatefound", onUpdateFound);
    };
  }, []);

  function applyUpdate() {
    if (!waitingWorker || reloadingRef.current) return;
    reloadingRef.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
  }

  if (!waitingWorker || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4 sm:bottom-8 sm:justify-end sm:px-6"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-accent/35 bg-bg-elevated px-4 py-3 shadow-[var(--shadow)]">
        <RefreshCw className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium leading-snug text-fg">
            A new version of MoneyGap AI is ready.
          </p>
          <p className="text-xs leading-relaxed text-fg-muted">
            Update when you have a moment — we won’t refresh while you’re mid-task.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button type="button" size="sm" onClick={applyUpdate}>
              Update now
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-fg-subtle transition hover:bg-bg-muted hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
