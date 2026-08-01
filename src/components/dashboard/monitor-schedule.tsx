"use client";

import { useState, useTransition } from "react";
import { UpgradePrompt, type UpgradePayload } from "@/components/billing/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
] as const;

type Schedule = {
  id: string;
  frequency: string;
  intervalDays: number | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
} | null;

export function MonitorScheduleControl({
  websiteId,
  initialSchedule,
}: {
  websiteId: string;
  initialSchedule: Schedule;
}) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [frequency, setFrequency] = useState(initialSchedule?.frequency ?? "weekly");
  const [intervalDays, setIntervalDays] = useState(
    initialSchedule?.intervalDays ?? 7,
  );
  const [enabled, setEnabled] = useState(initialSchedule?.enabled ?? false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradePayload | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next?: { frequency?: string; enabled?: boolean; intervalDays?: number }) {
    startTransition(async () => {
      setMsg(null);
      setUpgrade(null);
      const body = {
        frequency: next?.frequency ?? frequency,
        enabled: next?.enabled ?? enabled,
        intervalDays:
          (next?.frequency ?? frequency) === "custom"
            ? (next?.intervalDays ?? intervalDays)
            : null,
      };
      const res = await fetch(`/api/websites/${websiteId}/monitor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as UpgradePayload & {
        schedule?: Schedule;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 403 || data.code === "upgrade_required") {
          setUpgrade(data);
          if (next?.enabled === true) setEnabled(false);
        } else {
          setMsg(data.error ?? "Could not save schedule");
        }
        return;
      }
      setSchedule(data.schedule ?? null);
      if (data.schedule) {
        setFrequency(data.schedule.frequency);
        setEnabled(data.schedule.enabled);
        if (data.schedule.intervalDays) setIntervalDays(data.schedule.intervalDays);
      }
      setMsg("Monitor schedule saved");
    });
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          MoneyGap Monitor™
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            save({ enabled: next });
          }}
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium transition",
            enabled
              ? "bg-accent-soft text-accent"
              : "bg-bg-muted text-fg-muted hover:text-fg",
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FREQUENCIES.map((f) => (
          <button
            key={f.value}
            type="button"
            disabled={pending || !enabled}
            onClick={() => {
              setFrequency(f.value);
              save({ frequency: f.value, enabled: true });
            }}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] transition",
              frequency === f.value && enabled
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted hover:border-border-strong",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {frequency === "custom" && enabled && (
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          Every
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value) || 7)}
            onBlur={() => save({ intervalDays })}
            className="w-16 rounded-md border border-border bg-bg px-2 py-1 tabular-nums"
          />
          days
        </label>
      )}
      {schedule?.nextRunAt && enabled && (
        <p className="text-[11px] text-fg-subtle">
          Next run{" "}
          <Badge tone="neutral">
            {new Date(schedule.nextRunAt).toLocaleDateString()}
          </Badge>
        </p>
      )}
      {upgrade && <UpgradePrompt payload={upgrade} compact />}
      {msg && <p className="text-[11px] text-accent">{msg}</p>}
    </div>
  );
}
