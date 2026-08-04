"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FlashToast,
  makeFlashToast,
  type FlashToastState,
} from "@/components/ui/flash-toast";
import { DIGEST_FREQUENCIES, type DigestFrequency } from "@/lib/email/types";

type Prefs = {
  email: string;
  timezone: string;
  weeklyGrowthDigest: boolean;
  aiReadinessUpdates: boolean;
  developerTips: boolean;
  productUpdates: boolean;
  securityNotifications: boolean;
  monthlyProductSummary: boolean;
  digestFrequency: string;
  lastDigestSentAt: string | null;
};

const CHANNELS: { key: keyof Prefs; label: string; hint: string }[] = [
  {
    key: "weeklyGrowthDigest",
    label: "Weekly Growth Digest™",
    hint: "Personalized score, gaps, and Fix Path™ priorities",
  },
  {
    key: "aiReadinessUpdates",
    label: "AI Readiness Updates",
    hint: "llms.txt and AI visibility changes",
  },
  {
    key: "developerTips",
    label: "Developer Tips",
    hint: "CLI, CI/CD, and code-level fix checklists",
  },
  {
    key: "productUpdates",
    label: "Product Updates",
    hint: "New MoneyGap features, launches, and welcome nurture day-2/day-7 (when live)",
  },
  {
    key: "securityNotifications",
    label: "Security Notifications",
    hint: "Important account and security alerts",
  },
  {
    key: "monthlyProductSummary",
    label: "Monthly Product Summary",
    hint: "Once-a-month product roundup",
  },
];

export default function EmailPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [toast, setToast] = useState<FlashToastState>(null);
  const [saving, setSaving] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/email/preferences");
      if (!res.ok) return;
      const data = (await res.json()) as { preferences: Prefs };
      setPrefs(data.preferences);
    })();
  }, []);

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return;
    setSaving(true);
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const res = await fetch("/api/email/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!res.ok) {
      setToast(makeFlashToast("Could not save preferences", "error"));
      return;
    }
    const data = (await res.json()) as { preferences: Prefs };
    setPrefs(data.preferences);
    setToast(makeFlashToast("Email preferences saved", "success"));
  }

  if (!prefs) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-sm text-fg-muted">Loading preferences…</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FlashToast toast={toast} onDismiss={dismissToast} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Email Preferences
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Growth Digest™ &amp; channels
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Personalized growth insights — not generic marketing. Delivered to{" "}
          <span className="font-medium text-fg">{prefs.email}</span>. Day-0 welcome
          is transactional; day-2/7 nurture respects <strong className="font-medium text-fg">Product updates</strong> when live.
          Review drafts in Email Center (AI Estimate impact claims are not guarantees).
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Digest frequency</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIGEST_FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                disabled={saving}
                onClick={() => void save({ digestFrequency: f as DigestFrequency })}
                className={
                  prefs.digestFrequency === f
                    ? "rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent"
                    : "rounded-xl border border-border px-3 py-2 text-sm text-fg-muted hover:border-border-strong"
                }
              >
                {f === "off" ? "Off" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <label className="grid gap-1.5 text-xs font-medium text-fg-muted">
            Timezone (IANA)
            <input
              className="h-11 rounded-xl border border-border bg-bg px-3 text-sm text-fg"
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              onBlur={() => void save({ timezone: prefs.timezone })}
              placeholder="America/New_York"
            />
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Channels</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {CHANNELS.map((c) => {
            const on = Boolean(prefs[c.key]);
            return (
              <div
                key={c.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{c.label}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{c.hint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={saving}
                  onClick={() => void save({ [c.key]: !on } as Partial<Prefs>)}
                  className={
                    on
                      ? "h-6 w-11 shrink-0 rounded-full border border-accent bg-accent"
                      : "h-6 w-11 shrink-0 rounded-full border border-border bg-bg-muted"
                  }
                >
                  <span
                    className={
                      on
                        ? "block h-5 w-5 translate-x-[1.35rem] rounded-full bg-bg-elevated"
                        : "block h-5 w-5 translate-x-0.5 rounded-full bg-bg-elevated"
                    }
                  />
                </button>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button href="/dashboard/email" variant="secondary">
          Open Email Center
        </Button>
        <Button href="/dashboard/settings" variant="ghost">
          Back to settings
        </Button>
      </div>
    </div>
  );
}
