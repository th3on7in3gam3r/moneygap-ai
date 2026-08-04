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
  meta?: {
    error?: string;
    reviewStatus?: string;
    sequence?: string;
    stepId?: string;
  } | null;
};

type WelcomeStepId = "day0" | "day2" | "day7";

const WELCOME_STEPS: { id: WelcomeStepId; label: string }[] = [
  { id: "day0", label: "Day 0 — Welcome" },
  { id: "day2", label: "Day 2 — Fix Paths™" },
  { id: "day7", label: "Day 7 — Growth Digest™" },
];

export default function EmailCenterPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [welcomeStep, setWelcomeStep] = useState<WelcomeStepId>("day0");
  const [welcomeHtml, setWelcomeHtml] = useState<string | null>(null);
  const [welcomeSubject, setWelcomeSubject] = useState<string | null>(null);
  const [welcomeLive, setWelcomeLive] = useState(false);
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
    void refresh();
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Send failed", "error"));
      return;
    }
    setToast(makeFlashToast("Test digest sent to your email", "success"));
  }

  async function previewWelcome(step: WelcomeStepId = welcomeStep) {
    setBusy(true);
    const res = await fetch(`/api/email/welcome/preview?step=${step}`);
    setBusy(false);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      html?: string;
      subject?: string;
      live?: boolean;
    };
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Welcome preview failed", "error"));
      return;
    }
    setWelcomeHtml(data.html ?? null);
    setWelcomeSubject(data.subject ?? null);
    setWelcomeLive(Boolean(data.live));
    setToast(makeFlashToast("Welcome preview ready", "success"));
  }

  async function sendWelcomeTest() {
    setBusy(true);
    const res = await fetch("/api/email/welcome/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: welcomeStep }),
    });
    setBusy(false);
    const data = (await res.json()) as { ok?: boolean; error?: string };
    void refresh();
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Welcome test send failed", "error"));
      return;
    }
    setToast(makeFlashToast("Welcome test sent to your email", "success"));
  }

  async function queueWelcomeDrafts() {
    setBusy(true);
    const res = await fetch("/api/email/welcome/enroll", { method: "POST" });
    setBusy(false);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      queued?: number;
    };
    void refresh();
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Could not queue drafts", "error"));
      return;
    }
    setToast(
      makeFlashToast(
        `Queued ${data.queued ?? 0} welcome draft(s) (no send)`,
        "success",
      ),
    );
  }

  async function approveDraft(deliveryId: string) {
    setBusy(true);
    const res = await fetch("/api/email/welcome/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId }),
    });
    setBusy(false);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
      sent?: boolean;
    };
    void refresh();
    if (!res.ok || !data.ok) {
      setToast(makeFlashToast(data.error ?? "Approve failed", "error"));
      return;
    }
    setToast(
      makeFlashToast(
        data.sent
          ? "Approved and sent"
          : (data.message ?? "Draft approved (still queued)"),
        "success",
      ),
    );
  }

  const welcomeDrafts = deliveries.filter(
    (d) =>
      d.status === "queued" &&
      (d.meta?.sequence === "welcome" || d.templateKey.startsWith("welcome.")),
  );

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
          Upcoming digests, welcome sequence drafts, recent sends, and subscription
          status.
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
            <h2 className="font-display text-lg font-semibold">Digest actions</h2>
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
              Digest preview{previewSubject ? ` — ${previewSubject}` : ""}
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
          <h2 className="font-display text-lg font-semibold">
            Welcome / nurture sequence
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-fg-muted">
            Drafts only until <code className="text-xs">EMAIL_WELCOME_LIVE=1</code>.
            Signup queues deliveries without sending. Revenue / conversion impact
            claims for this gap are <strong className="text-fg">AI Estimates</strong>
            — not guarantees.
            {welcomeLive ? (
              <span className="ml-1 text-accent">Live approve is ON.</span>
            ) : (
              <span className="ml-1">Live approve is OFF.</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-fg-muted" htmlFor="welcome-step">
              Step
            </label>
            <select
              id="welcome-step"
              className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm"
              value={welcomeStep}
              onChange={(e) => setWelcomeStep(e.target.value as WelcomeStepId)}
            >
              {WELCOME_STEPS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void previewWelcome()}
            >
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void sendWelcomeTest()}
            >
              Send test to me
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void queueWelcomeDrafts()}
            >
              Queue drafts for me
            </Button>
          </div>
          {welcomeHtml ? (
            <iframe
              title="Welcome preview"
              className="h-[28rem] w-full rounded-xl border border-border bg-bg"
              srcDoc={welcomeHtml}
            />
          ) : null}
          {welcomeSubject ? (
            <p className="text-xs text-fg-muted">Subject: {welcomeSubject}</p>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold text-fg">Queued welcome drafts</h3>
            {welcomeDrafts.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">
                No queued welcome drafts. Use “Queue drafts for me” or create a new
                workspace path.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {welcomeDrafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-fg">{d.subject}</p>
                      <p className="text-xs text-fg-muted">
                        {d.templateKey} · review: {d.meta?.reviewStatus ?? "pending"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void approveDraft(d.id)}
                    >
                      Approve
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Recent emails</h2>
        </CardHeader>
        <CardBody>
          {deliveries.length === 0 ? (
            <p className="text-sm text-fg-muted">No emails sent yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {deliveries.map((d) => {
                const errorMsg =
                  typeof d.meta?.error === "string" ? d.meta.error : null;
                return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{d.subject}</p>
                      <p className="text-xs text-fg-muted">
                        {d.channel} · {d.templateKey}
                      </p>
                      {d.status === "failed" && errorMsg ? (
                        <p className="mt-1 text-xs text-danger" title={errorMsg}>
                          {errorMsg.length > 120
                            ? `${errorMsg.slice(0, 120)}…`
                            : errorMsg}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs ${
                        d.status === "failed"
                          ? "bg-danger-soft text-danger"
                          : d.status === "sent"
                            ? "bg-accent-soft text-accent"
                            : "bg-bg-muted text-fg-muted"
                      }`}
                    >
                      {d.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
