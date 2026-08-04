"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FlashToast,
  makeFlashToast,
  type FlashToastState,
} from "@/components/ui/flash-toast";

type Prefs = {
  weeklyGrowthDigest: boolean;
  digestFrequency: string;
  timezone: string;
  lastDigestSentAt: string | null;
  email: string;
};

type Delivery = {
  id: string;
  channel: string;
  templateKey: string;
  subject: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export default function EmailCenterPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<FlashToastState>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch("/api/email/preferences"),
      fetch("/api/email/deliveries"),
    ]);
    if (pRes.ok) {
      const data = (await pRes.json()) as { preferences: Prefs };
      setPrefs(data.preferences);
    }
    if (dRes.ok) {
      const data = (await dRes.json()) as { deliveries: Delivery[] };
      setDeliveries(data.deliveries ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function preview() {
    setBusy(true);
    const res = await fetch("/api/email/digest/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send: false }),
    });
    setBusy(false);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      html?: string;
      subject?: string;
    };
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Preview failed", "error"));
      return;
    }
    setPreviewHtml(data.html ?? null);
    setPreviewSubject(data.subject ?? null);
    setToast(makeFlashToast("Preview ready", "success"));
  }

  async function sendTest() {
    setBusy(true);
    const res = await fetch("/api/email/digest/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send: true }),
    });
    setBusy(false);
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Send failed", "error"));
      return;
    }
    setToast(makeFlashToast("Test digest sent to your email", "success"));
    void refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FlashToast toast={toast} onDismiss={dismissToast} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Email Center
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          MoneyGap Growth Digest™
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Upcoming digests, recent sends, and subscription status.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Subscription</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>
              Digest:{" "}
              <span className="font-medium text-fg">
                {prefs?.weeklyGrowthDigest
                  ? prefs.digestFrequency
                  : "off"}
              </span>
            </p>
            <p className="text-fg-muted">Timezone: {prefs?.timezone ?? "UTC"}</p>
            <p className="text-fg-muted">
              Last sent:{" "}
              {prefs?.lastDigestSentAt
                ? new Date(prefs.lastDigestSentAt).toLocaleString()
                : "Never"}
            </p>
            <Button href="/dashboard/settings/email" variant="secondary" size="sm">
              Manage preferences
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Actions</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void preview()}>
              Preview digest
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void sendTest()}
            >
              Send test to me
            </Button>
          </CardBody>
        </Card>
      </div>

      {previewHtml ? (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Preview{previewSubject ? ` — ${previewSubject}` : ""}
            </h2>
          </CardHeader>
          <CardBody>
            <iframe
              title="Digest preview"
              className="h-[28rem] w-full rounded-xl border border-border bg-bg"
              srcDoc={previewHtml}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Recent emails</h2>
        </CardHeader>
        <CardBody>
          {deliveries.length === 0 ? (
            <p className="text-sm text-fg-muted">No emails sent yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {deliveries.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-fg">{d.subject}</p>
                    <p className="text-xs text-fg-muted">
                      {d.channel} · {d.templateKey}
                    </p>
                  </div>
                  <span className="rounded-lg bg-bg-muted px-2 py-1 text-xs text-fg-muted">
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
