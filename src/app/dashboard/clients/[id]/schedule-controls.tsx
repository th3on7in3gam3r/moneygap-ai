"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClientScheduleControls({ clientId }: { clientId: string }) {
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly">(
    "monthly",
  );
  const [enabled, setEnabled] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch(`/api/clients/${clientId}/report-schedule`)
      .then((r) => r.json())
      .then((data: { schedule?: { frequency: string; enabled: boolean; nextRunAt: string | null } | null }) => {
        if (data.schedule) {
          setFrequency(data.schedule.frequency as "weekly" | "monthly" | "quarterly");
          setEnabled(data.schedule.enabled);
          setNextRunAt(data.schedule.nextRunAt);
        }
      })
      .catch(() => undefined);
  }, [clientId]);

  function save(nextEnabled = enabled) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch(`/api/clients/${clientId}/report-schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, enabled: nextEnabled }),
      });
      const data = (await res.json()) as {
        schedule?: { nextRunAt: string | null };
        error?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Could not save");
        return;
      }
      setEnabled(nextEnabled);
      setNextRunAt(data.schedule?.nextRunAt ?? null);
      setMsg("Schedule saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">Automated client reports</h2>
      </CardHeader>
      <CardBody className="flex flex-wrap items-center gap-3">
        {(["weekly", "monthly", "quarterly"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFrequency(f)}
            className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
              frequency === f
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted"
            }`}
          >
            {f}
          </button>
        ))}
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => save(!enabled)}
        >
          {enabled ? "Disable" : "Enable"}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => save(true)}>
          Save
        </Button>
        {nextRunAt && enabled && (
          <p className="text-xs text-fg-subtle">
            Next run {new Date(nextRunAt).toLocaleDateString()}
          </p>
        )}
        {msg && <p className="text-xs text-accent">{msg}</p>}
      </CardBody>
    </Card>
  );
}
