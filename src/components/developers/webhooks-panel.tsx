"use client";

import { useState } from "react";
import type {
  WebhookDeliveryRow,
  WebhookRow,
} from "@/components/developers/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function WebhooksPanel({
  webhooks,
  events,
  deliveries,
  hasApiAccess,
  pending,
  onAdd,
  onToggle,
  onDelete,
  onUpdateEvents,
  onRetryDelivery,
}: {
  webhooks: WebhookRow[];
  events: string[];
  deliveries: WebhookDeliveryRow[];
  hasApiAccess: boolean;
  pending: boolean;
  onAdd: (input: { url: string; events: string[] }) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateEvents: (id: string, events: string[]) => void;
  onRetryDelivery: (id: string) => void;
}) {
  const [hookUrl, setHookUrl] = useState("");
  const catalog = events.length
    ? events
    : ["analysis.completed", "report.generated", "score.updated"];
  const [selected, setSelected] = useState<string[]>([
    "analysis.completed",
  ]);

  function toggleEvent(ev: string) {
    setSelected((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Webhooks</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[240px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              placeholder="https://example.com/webhooks/moneygap"
            />
            <Button
              type="button"
              size="sm"
              disabled={
                pending || !hookUrl || !hasApiAccess || selected.length === 0
              }
              onClick={() => {
                onAdd({ url: hookUrl, events: selected });
                setHookUrl("");
              }}
            >
              Add endpoint
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            {catalog.map((ev) => (
              <label
                key={ev}
                className="inline-flex items-center gap-2 text-sm text-fg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                />
                <span className="font-mono text-xs text-fg">{ev}</span>
              </label>
            ))}
          </div>

          <ul className="space-y-3">
            {webhooks.map((w) => (
              <li
                key={w.id}
                className="space-y-2 rounded-xl border border-border px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{w.url}</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {w.events.join(", ")}
                    </p>
                  </div>
                  <Badge tone={w.enabled ? "accent" : "neutral"}>
                    {w.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => onToggle(w.id, !w.enabled)}
                  >
                    {w.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      onUpdateEvents(
                        w.id,
                        w.events.length === catalog.length
                          ? ["analysis.completed"]
                          : [...catalog],
                      )
                    }
                  >
                    {w.events.length === catalog.length
                      ? "Only analysis.completed"
                      : "Subscribe all events"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    className="text-danger"
                    onClick={() => onDelete(w.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            {webhooks.length === 0 && (
              <p className="text-sm text-fg-muted">No webhook endpoints yet.</p>
            )}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">
            Recent deliveries
          </h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-xs last:border-0"
            >
              <div>
                <p className="font-mono text-fg">
                  {d.event} · {d.status}
                  {d.responseStatus != null ? ` · HTTP ${d.responseStatus}` : ""}
                </p>
                <p className="text-fg-muted">
                  attempt {d.attempts}
                  {d.lastError ? ` · ${d.lastError}` : ""} ·{" "}
                  {new Date(d.createdAt).toLocaleString()}
                </p>
              </div>
              {d.status !== "delivered" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onRetryDelivery(d.id)}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="text-sm text-fg-muted">No deliveries logged yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
