import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { GapSeverity } from "@/lib/types/money-gap";

const severityTone: Record<GapSeverity, string> = {
  critical: "bg-danger text-white",
  high: "bg-gap text-gap-fg",
  medium: "bg-bg-muted text-fg-muted",
  low: "bg-accent-soft text-accent",
};

export function MoneyGapScore({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size === "lg" ? 54 : size === "sm" ? 28 : 40;
  const stroke = size === "lg" ? 8 : size === "sm" ? 5 : 6;
  const dim = radius * 2 + stroke * 2;
  const c = 2 * Math.PI * radius;
  const offset = c - (clamped / 100) * c;
  const tone =
    clamped >= 70 ? "var(--accent)" : clamped >= 50 ? "var(--gap)" : "var(--danger)";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display font-semibold tabular-nums text-fg",
            size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-xl",
          )}
        >
          {clamped}
        </span>
        {size !== "sm" && (
          <span className="text-[10px] uppercase tracking-[0.12em] text-fg-subtle">Gap</span>
        )}
      </div>
    </div>
  );
}

export function RevenueAtRisk({
  amount,
  label = "Revenue at risk / mo",
  className,
}: {
  amount: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="font-display text-3xl font-semibold tracking-tight text-gap tabular-nums">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

export function MoneyGapMeter({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>Money Gap Score</span>
        <span className="font-semibold tabular-nums text-fg">{clamped}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
        <div
          className="gap-meter-fill h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background:
              clamped >= 70
                ? "linear-gradient(90deg, var(--accent), #6ef0c0)"
                : clamped >= 50
                  ? "linear-gradient(90deg, var(--gap), #f0cf84)"
                  : "linear-gradient(90deg, var(--danger), #f5a0a0)",
          }}
        />
      </div>
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: GapSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
        severityTone[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function MoneyGapCard({
  title,
  description,
  severity,
  estimatedImpact,
  confidence,
  category,
  recommendation,
  status,
}: {
  title: string;
  description: string;
  severity: GapSeverity;
  estimatedImpact: number;
  confidence: number;
  category: string;
  recommendation: string;
  status: string;
}) {
  return (
    <article className="group rounded-2xl border border-border bg-bg-elevated p-5 transition hover:border-border-strong">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={severity} />
        <span className="rounded-md bg-bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
          {category}
        </span>
        <span className="ml-auto text-[11px] text-fg-subtle">{status.replace("_", " ")}</span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Impact / mo</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-gap">
            {formatCurrency(estimatedImpact)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Confidence</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-fg">
            {formatPercent(confidence, 0)}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-accent-soft/60 px-3 py-2.5 text-sm text-fg">
        <span className="font-medium text-accent">Fix: </span>
        {recommendation}
      </p>
    </article>
  );
}

export function CapturePotentialBar({
  atRisk,
  capture,
  className,
}: {
  atRisk: number;
  capture: number;
  className?: string;
}) {
  const pct = atRisk > 0 ? Math.round((capture / atRisk) * 100) : 0;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">Capture potential</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-accent">
            {formatCurrency(capture)}
          </p>
        </div>
        <p className="pb-1 text-sm text-fg-muted">{pct}% recoverable</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gap-soft">
        <div
          className="h-full rounded-full bg-accent transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
