"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type PulseStatus = {
  site: string;
  connected: boolean;
  collectKeyMasked: string | null;
  sitePixelReady: boolean;
  source: "env" | "settings" | null;
};

export function PulseCadenceSettings() {
  const [status, setStatus] = useState<PulseStatus | null>(null);
  const [collectKey, setCollectKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await fetch("/api/settings/pulse");
      if (!res.ok) {
        setError("Could not load Pulse settings");
        return;
      }
      setStatus((await res.json()) as PulseStatus);
      setError(null);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function save() {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/settings/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectKey }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        collectKeyMasked?: string;
        sitePixelReady?: boolean;
        source?: PulseStatus["source"];
      };
      if (!res.ok) {
        setError(data.error ?? "Could not save Collect key");
        return;
      }
      setCollectKey("");
      setSuccess(data.message ?? "Saved");
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              connected: true,
              collectKeyMasked: data.collectKeyMasked ?? prev.collectKeyMasked,
              sitePixelReady: data.sitePixelReady ?? true,
              source: data.source ?? "settings",
            }
          : prev,
      );
    });
  }

  function disconnect() {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/settings/pulse", { method: "DELETE" });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        sitePixelReady?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not disconnect");
        return;
      }
      setSuccess(data.message ?? "Disconnected");
      load();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Pulse (Cadence)</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Paste the Collect key (<code className="text-fg">pck_…</code>) from Cadence →
            Integrations → Pulse so the public site pixel can authenticate.
          </p>
        </div>
        <Badge tone={status?.sitePixelReady ? "success" : "neutral"}>
          {status?.sitePixelReady ? "pixel ready" : "not connected"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-1 text-sm text-fg-muted">
          <p>
            Site ID:{" "}
            <span className="font-medium text-fg">{status?.site ?? "moneygap-ai-com"}</span>
          </p>
          {status?.collectKeyMasked && (
            <p>
              Collect key:{" "}
              <span className="font-mono text-xs text-fg">{status.collectKeyMasked}</span>
              {status.source === "env" && (
                <span className="ml-2 text-xs text-fg-subtle">(from host env)</span>
              )}
            </p>
          )}
          <p className="text-xs text-fg-subtle">
            The Cadence Dashboard Read Key (<code className="text-fg-muted">psk_…</code>) unlocks
            Pulse dashboards inside Pulse — it is not part of this website pixel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={collectKey}
            onChange={(e) => setCollectKey(e.target.value)}
            placeholder="pck_… from Cadence Pulse snippet"
            className="min-w-[240px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || collectKey.trim().length < 8}
            onClick={save}
          >
            {pending ? "Saving…" : status?.connected ? "Update key" : "Save Collect key"}
          </Button>
          {status?.connected && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={disconnect}
            >
              Disconnect
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            href="/dashboard/integrations"
          >
            Integration Hub
          </Button>
        </div>

        {error && <p className="text-sm text-gap">{error}</p>}
        {success && (
          <p role="status" className="text-sm text-accent">
            {success}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
