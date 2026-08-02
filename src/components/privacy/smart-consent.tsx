"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CATEGORY_DEFS,
  acceptAllCategories,
  normalizeCategories,
  rejectOptionalCategories,
  type ConsentCategories,
} from "@/lib/privacy/categories";
import { persistConsentClient, readConsentClient } from "@/lib/privacy/client-gate";
import { CONSENT_SCHEMA_VERSION } from "@/lib/privacy/versions";
import { cn } from "@/lib/utils";

type Mode = "hidden" | "welcome" | "customize";

export function SmartConsent({
  forceOpen = false,
  onClose,
  embedded = false,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [categories, setCategories] = useState<ConsentCategories>(
    rejectOptionalCategories(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const local = readConsentClient();
    if (local?.v === CONSENT_SCHEMA_VERSION && !forceOpen) {
      setCategories(local.c);
      setMode("hidden");
      return;
    }
    try {
      const res = await fetch("/api/privacy/consent");
      if (res.ok) {
        const data = (await res.json()) as {
          needsPrompt?: boolean;
          categories?: ConsentCategories;
        };
        if (data.categories) setCategories(normalizeCategories(data.categories));
        if (forceOpen || data.needsPrompt) {
          setMode(embedded ? "customize" : "welcome");
        } else {
          setMode("hidden");
          if (data.categories) persistConsentClient(normalizeCategories(data.categories));
        }
        return;
      }
    } catch {
      /* fall through */
    }
    if (forceOpen || !local || local.v !== CONSENT_SCHEMA_VERSION) {
      setMode(embedded ? "customize" : "welcome");
    }
  }, [forceOpen, embedded]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (forceOpen) setMode(embedded ? "customize" : "welcome");
  }, [forceOpen, embedded]);

  async function save(
    action: "accept_all" | "reject_optional" | "customize" | "withdraw",
    next?: ConsentCategories,
  ) {
    setSaving(true);
    setError(null);
    const cats =
      action === "accept_all"
        ? acceptAllCategories()
        : action === "reject_optional" || action === "withdraw"
          ? rejectOptionalCategories()
          : normalizeCategories(next ?? categories);

    try {
      const res = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          categories: cats,
          source: embedded ? "privacy_center" : "smart_consent",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        categories?: ConsentCategories;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not save preferences.");
        setSaving(false);
        return;
      }
      const saved = normalizeCategories(data.categories ?? cats);
      persistConsentClient(saved);
      setCategories(saved);
      setMode("hidden");
      onClose?.();
    } catch {
      setError("Network error — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (mode === "hidden" && !embedded) return null;

  const header = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Smart Consent™
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">
        Welcome to MoneyGap AI
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        We respect your privacy.
        <br />
        You control what information you share.
        <br />
        We&apos;ll always explain why we ask.
      </p>
    </>
  );

  const categoryList =
    mode === "customize" || embedded ? (
      <ul className="space-y-3">
        {CONSENT_CATEGORY_DEFS.map((def) => {
          const on = categories[def.id];
          return (
            <li
              key={def.id}
              className="rounded-xl border border-border bg-bg px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {def.locked || on ? "✓ " : ""}
                    {def.label}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">
                    {def.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {!def.currentlyActive && def.inactiveNote ? (
                    <p className="mt-1.5 text-[11px] text-fg-subtle">{def.inactiveNote}</p>
                  ) : null}
                </div>
                {!def.locked ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() =>
                      setCategories((c) => ({ ...c, [def.id]: !c[def.id] }))
                    }
                    className={cn(
                      "mt-0.5 h-6 w-11 shrink-0 rounded-full border transition",
                      on
                        ? "border-accent bg-accent"
                        : "border-border bg-bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "block h-5 w-5 translate-x-0.5 rounded-full bg-bg-elevated transition",
                        on && "translate-x-[1.35rem]",
                      )}
                    />
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-fg-subtle">Required</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    ) : null;

  const actions = (
    <>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {mode === "welcome" && !embedded ? (
          <>
            <Button
              size="md"
              disabled={saving}
              onClick={() => void save("accept_all")}
            >
              Accept All
            </Button>
            <Button
              size="md"
              variant="secondary"
              disabled={saving}
              onClick={() => void save("reject_optional")}
            >
              Reject Optional
            </Button>
            <Button
              size="md"
              variant="ghost"
              disabled={saving}
              onClick={() => setMode("customize")}
            >
              Customize
            </Button>
          </>
        ) : (
          <>
            <Button
              size="md"
              disabled={saving}
              onClick={() => void save("customize", categories)}
            >
              Save preferences
            </Button>
            <Button
              size="md"
              variant="secondary"
              disabled={saving}
              onClick={() => void save("accept_all")}
            >
              Accept All
            </Button>
            <Button
              size="md"
              variant="ghost"
              disabled={saving}
              onClick={() => void save("reject_optional")}
            >
              Reject Optional
            </Button>
          </>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-fg-subtle">
        Not legal advice. Review policies with counsel for your organization.{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/security" className="text-accent hover:underline">
          Security
        </Link>
        {" · "}
        <Link href="/dashboard/settings/privacy" className="text-accent hover:underline">
          Privacy Center™
        </Link>
      </p>
    </>
  );

  if (embedded) {
    return (
      <div className="w-full max-w-none rounded-2xl border border-border bg-bg-elevated p-6">
        {header}
        {categoryList ? <div className="mt-5">{categoryList}</div> : null}
        <div className="mt-5 space-y-3">{actions}</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center sm:justify-end sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-consent-title"
    >
      <div className="absolute inset-0 bg-bg/50 backdrop-blur-[2px]" aria-hidden />
      <div
        className={cn(
          "relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-[var(--shadow)]",
          "max-h-[min(100dvh-2rem,40rem)]",
        )}
      >
        <div className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Smart Consent™
          </p>
          <h2
            id="smart-consent-title"
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg"
          >
            Welcome to MoneyGap AI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            We respect your privacy. You control what information you share.
            We&apos;ll always explain why we ask.
          </p>
        </div>

        {categoryList ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            {categoryList}
          </div>
        ) : null}

        <div className="shrink-0 space-y-3 border-t border-border bg-bg-elevated px-6 py-4">
          {actions}
        </div>
      </div>
    </div>
  );
}

export function openSmartConsentEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mg:open-smart-consent"));
  }
}
