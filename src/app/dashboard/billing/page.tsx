"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanRow = {
  id: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  limits: {
    analysesPerMonth: number;
    aiGenerationsPerMonth: number;
    maxSeats: number;
    maxClients: number;
  };
  features: string[];
};

type SubscriptionPayload = {
  subscription: {
    planId: string;
    status: string;
    billingInterval: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  };
  plan: PlanRow;
  usage: {
    periodStart: string;
    periodEnd: string;
    counters: Record<string, number>;
  };
};

function formatMoney(cents: number) {
  if (cents <= 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatLimit(n: number) {
  return n >= 999_999 ? "Unlimited" : String(n);
}

const USAGE_ROWS: { key: string; label: string; limitKey: keyof PlanRow["limits"] | string }[] = [
  { key: "website_analysis", label: "Website analyses", limitKey: "analysesPerMonth" },
  { key: "ai_generation", label: "AI generations", limitKey: "aiGenerationsPerMonth" },
  { key: "report_created", label: "Reports created", limitKey: "reportsPerMonth" },
  { key: "competitor_analysis", label: "Competitor analyses", limitKey: "competitorAnalysesPerMonth" },
  { key: "export", label: "Exports / shares", limitKey: "exportsPerMonth" },
];

export default function BillingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<SubscriptionPayload | null>(null);
  const [usageLimits, setUsageLimits] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const [pRes, sRes, uRes, cRes] = await Promise.all([
          fetch("/api/billing/plans"),
          fetch("/api/billing/subscription"),
          fetch("/api/billing/usage"),
          fetch("/api/billing/checkout"),
        ]);
        if (pRes.ok) {
          const data = (await pRes.json()) as { plans: PlanRow[] };
          setPlans(data.plans ?? []);
        }
        if (sRes.ok) {
          const data = (await sRes.json()) as SubscriptionPayload;
          setSub(data);
          if (data.subscription.billingInterval === "annual") setInterval("annual");
        }
        if (uRes.ok) {
          const data = (await uRes.json()) as { limits: Record<string, number> };
          setUsageLimits(data.limits ?? {});
        }
        if (cRes.ok) {
          const data = (await cRes.json()) as { configured?: boolean };
          setStripeConfigured(!!data.configured);
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function switchPlan(planId: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingInterval: interval }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not change plan");
        return;
      }
      setMsg(`Plan updated to ${planId} (soft switch).`);
      const sRes = await fetch("/api/billing/subscription");
      if (sRes.ok) setSub((await sRes.json()) as SubscriptionPayload);
    });
  }

  function checkout(planId: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingInterval: interval }),
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Checkout unavailable");
        return;
      }
      if (data.url) window.location.href = data.url;
    });
  }

  function openPortal() {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Portal unavailable");
        return;
      }
      if (data.url) window.location.href = data.url;
    });
  }

  const currentPlanId = sub?.subscription.planId ?? "free";
  const counters = sub?.usage.counters ?? {};

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Plan, usage, and entitlements.{" "}
          {stripeConfigured
            ? "Stripe Checkout and Customer Portal are enabled."
            : "Stripe soft-enables when STRIPE_* keys are set; soft plan switching always works."}
        </p>
      </div>

      {msg && <p className="text-sm text-accent">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Current plan</h2>
            <Badge tone="accent">{sub?.plan.name ?? "…"}</Badge>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-fg-muted">
            <p>{sub?.plan.description}</p>
            <p>
              Status: <span className="text-fg">{sub?.subscription.status ?? "—"}</span>
            </p>
            <p>
              Interval:{" "}
              <span className="text-fg capitalize">
                {sub?.subscription.billingInterval ?? "monthly"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending || !stripeConfigured}
                onClick={openPortal}
              >
                Customer Portal
              </Button>
              <Badge tone={stripeConfigured ? "accent" : "neutral"}>
                {stripeConfigured ? "Stripe on" : "Stripe off"}
              </Badge>
            </div>
            <p className="text-xs text-fg-subtle">
              Soft switch remains available for development without Stripe.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">This period usage</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {USAGE_ROWS.map((row) => {
              const used = counters[row.key] ?? 0;
              const limit = usageLimits[row.key] ?? 0;
              const pct =
                limit > 0 && limit < 999_999
                  ? Math.min(100, Math.round((used / limit) * 100))
                  : 0;
              return (
                <div key={row.key}>
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>{row.label}</span>
                    <span className="tabular-nums">
                      {used} / {formatLimit(limit)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Compare plans</h2>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {(["monthly", "annual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInterval(v)}
              className={cn(
                "rounded-md px-3 py-1.5 capitalize",
                interval === v ? "bg-accent-soft text-accent" : "text-fg-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const price =
            interval === "annual" ? plan.annualPriceCents : plan.monthlyPriceCents;
          const isCurrent = plan.id === currentPlanId;
          return (
            <Card key={plan.id} className={isCurrent ? "border-accent" : undefined}>
              <CardHeader>
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                {isCurrent && <Badge tone="accent">Current</Badge>}
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-fg-muted">{plan.description}</p>
                <p className="font-display text-3xl font-semibold tracking-tight">
                  {formatMoney(price)}
                  <span className="text-sm font-medium text-fg-subtle">
                    /{interval === "annual" ? "yr" : "mo"}
                  </span>
                </p>
                <ul className="space-y-1 text-xs text-fg-muted">
                  <li>{formatLimit(plan.limits.analysesPerMonth)} analyses / mo</li>
                  <li>{formatLimit(plan.limits.aiGenerationsPerMonth)} AI generations / mo</li>
                  <li>{formatLimit(plan.limits.maxSeats)} seats</li>
                  {plan.limits.maxClients > 0 && (
                    <li>{formatLimit(plan.limits.maxClients)} clients</li>
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isCurrent ? "secondary" : "primary"}
                    disabled={pending || isCurrent}
                    onClick={() => switchPlan(plan.id)}
                  >
                    {isCurrent ? "Current plan" : "Switch (soft)"}
                  </Button>
                  {stripeConfigured && plan.id !== "free" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => checkout(plan.id)}
                    >
                      Checkout
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-fg-subtle">
        <Button href="/dashboard/settings" variant="ghost" size="sm">
          ← Back to Settings
        </Button>
      </p>
    </div>
  );
}
