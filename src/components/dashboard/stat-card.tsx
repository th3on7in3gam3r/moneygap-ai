import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  delta,
  tone = "default",
  format = "number",
}: {
  label: string;
  value: number;
  delta?: number;
  tone?: "default" | "gap" | "accent";
  format?: "number" | "currency" | "score";
}) {
  const display =
    format === "currency"
      ? formatCurrency(value, { compact: value >= 10000 })
      : format === "score"
        ? `${value}`
        : formatNumber(value, value >= 10000);

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
        <p
          className={cn(
            "font-display text-3xl font-semibold tracking-tight tabular-nums",
            tone === "gap" && "text-gap",
            tone === "accent" && "text-accent",
            tone === "default" && "text-fg",
          )}
        >
          {display}
          {format === "score" && (
            <span className="ml-1 text-base font-medium text-fg-subtle">/100</span>
          )}
        </p>
        {typeof delta === "number" && (
          <p
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              delta >= 0 ? "text-success" : "text-danger",
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta)}% vs last period
          </p>
        )}
      </CardBody>
    </Card>
  );
}
