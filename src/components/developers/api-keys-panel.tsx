"use client";

import { useState } from "react";
import {
  API_SCOPES,
  type ApiScope,
  type UsageSummary,
} from "@/components/developers/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function ApiKeysPanel({
  summary,
  pending,
  onCreate,
  onRotate,
  onRevoke,
}: {
  summary: UsageSummary | null;
  pending: boolean;
  onCreate: (input: {
    name: string;
    environment: "development" | "production";
    scopes: ApiScope[];
  }) => void;
  onRotate: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const [keyName, setKeyName] = useState("Default key");
  const [keyEnv, setKeyEnv] = useState<"development" | "production">(
    "development",
  );
  const [scopes, setScopes] = useState<ApiScope[]>([...API_SCOPES]);

  function toggleScope(scope: ApiScope) {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope],
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">API keys</h2>
        <Badge tone={summary?.hasApiAccess ? "accent" : "neutral"}>
          {summary?.hasApiAccess ? "Enabled" : "Locked"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[160px] flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name"
          />
          <select
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={keyEnv}
            onChange={(e) =>
              setKeyEnv(e.target.value as "development" | "production")
            }
          >
            <option value="development">Development (mg_test_)</option>
            <option value="production">Production (mg_live_)</option>
          </select>
          <Button
            type="button"
            size="sm"
            disabled={
              pending || !summary?.hasApiAccess || scopes.length === 0
            }
            onClick={() =>
              onCreate({ name: keyName, environment: keyEnv, scopes })
            }
          >
            Generate key
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {API_SCOPES.map((scope) => (
            <label
              key={scope}
              className="inline-flex items-center gap-2 text-sm text-fg-muted"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              <span className="font-mono text-xs text-fg">{scope}</span>
            </label>
          ))}
        </div>

        <ul className="space-y-2">
          {(summary?.keys ?? []).map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-fg">{k.name}</p>
                <p className="text-xs text-fg-muted">
                  {k.keyPrefix}… · {k.environment} · {k.rateLimitPerMinute}/min
                  {k.scopes?.length
                    ? ` · ${k.scopes.join(", ")}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onRotate(k.id)}
                >
                  Rotate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => onRevoke(k.id)}
                  className="text-danger"
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
          {(summary?.keys.length ?? 0) === 0 && (
            <p className="text-sm text-fg-muted">No active keys yet.</p>
          )}
        </ul>
      </CardBody>
    </Card>
  );
}
