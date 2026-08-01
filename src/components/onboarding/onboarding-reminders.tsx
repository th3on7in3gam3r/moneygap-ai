"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type Reminder = { id: string; message: string; href: string };

export function OnboardingReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        enabled?: boolean;
        onboarding?: { status?: string };
        reminders?: Reminder[];
      };
      if (!data.enabled) return;
      if (data.onboarding?.status === "completed") {
        setReminders([]);
        return;
      }
      setReminders(data.reminders ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function dismiss(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_reminder", id }),
    }).catch(() => null);
  }

  if (!reminders.length) return null;
  const top = reminders[0]!;

  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-fg">{top.message}</p>
        <Link
          href={top.href}
          className="text-xs font-semibold text-accent hover:underline"
        >
          Continue setup →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss reminder"
        className="rounded-lg p-1 text-fg-subtle hover:bg-bg-muted hover:text-fg"
        onClick={() => void dismiss(top.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
