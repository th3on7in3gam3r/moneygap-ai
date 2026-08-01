"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UpgradePayload = {
  code?: string;
  error?: string;
  message?: string;
  feature?: string;
  suggestedPlan?: string;
  limit?: number;
  used?: number;
};

export function UpgradePrompt({
  payload,
  className,
  compact,
}: {
  payload: UpgradePayload | string;
  className?: string;
  compact?: boolean;
}) {
  const data =
    typeof payload === "string"
      ? { message: payload }
      : payload;
  const message =
    data.message ?? data.error ?? "Upgrade to unlock this capability.";
  const plan = data.suggestedPlan;

  return (
    <div
      className={cn(
        "rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3",
        className,
      )}
    >
      <p className={cn("text-sm text-fg", compact && "text-xs")}>{message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button href="/dashboard/billing" size="sm" variant="primary">
          {plan ? `View ${plan.replace(/_/g, " ")} plans` : "View billing"}
        </Button>
        {!compact && (
          <Link
            href="/dashboard/billing"
            className="text-xs text-fg-muted underline-offset-2 hover:underline"
          >
            Compare plans & usage
          </Link>
        )}
      </div>
    </div>
  );
}

export function FeatureLocked({
  title,
  message,
  suggestedPlan,
  className,
}: {
  title?: string;
  message: string;
  suggestedPlan?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-bg-muted/40 px-4 py-5",
        className,
      )}
    >
      {title && (
        <p className="font-display text-sm font-semibold text-fg">{title}</p>
      )}
      <UpgradePrompt
        className="mt-2 border-0 bg-transparent p-0"
        payload={{ message, suggestedPlan }}
      />
    </div>
  );
}

export function isUpgradeResponse(
  data: unknown,
  status?: number,
): data is UpgradePayload {
  if (!data || typeof data !== "object") return false;
  const d = data as UpgradePayload;
  return (
    status === 403 ||
    d.code === "upgrade_required" ||
    d.code === "usage_limit"
  );
}
