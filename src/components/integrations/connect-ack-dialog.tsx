"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const INTEGRATIONS_ACK_KEY = "mg_integrations_ack_v1";

export function hasIntegrationsAck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INTEGRATIONS_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setIntegrationsAck() {
  try {
    window.localStorage.setItem(INTEGRATIONS_ACK_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function ConnectAckDialog({
  open,
  providerName,
  onCancel,
  onConfirmed,
}: {
  open: boolean;
  providerName: string;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const titleId = useId();
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setChecked(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[min(90vh,36rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-bg-elevated p-5 shadow-xl outline-none sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Before you connect
        </p>
        <h2 id={titleId} className="mt-2 font-display text-xl font-semibold text-fg">
          Connect {providerName}?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Connecting helps MoneyGap see your growth stack beyond the public site
          for Integration Health, Fix Path tooling, and (for GitHub) Developer
          Mode™. Credentials are encrypted. Sync soft-fails and never blocks
          reports. MoneyGap Score™ is not rewritten by Hub connections. Most
          connectors stage credentials today — live Engine enrichment ships
          incrementally. Nothing auto-publishes or emails customers.
        </p>

        <label
          htmlFor={checkboxId}
          className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg px-3 py-3 text-sm text-fg"
        >
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            I understand connections help MoneyGap see my stack for Hub health
            and Fix Path tooling (e.g. GitHub), and that scores stay
            human-reviewed with AI Estimate labels — not guaranteed ROI.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!checked}
            onClick={() => {
              setIntegrationsAck();
              onConfirmed();
            }}
          >
            Continue to connect
          </Button>
        </div>
      </div>
    </div>
  );
}
