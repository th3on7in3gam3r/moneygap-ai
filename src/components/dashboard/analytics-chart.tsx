"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/types/money-gap";
import { formatCurrency, formatNumber } from "@/lib/utils";

export type ScoreTrendPoint = {
  date: string;
  score: number;
  revenueAtRisk: number;
  capturePotential?: number;
};

export function AnalyticsChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v) => formatNumber(v, true)}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--fg)",
            }}
            labelFormatter={(v) =>
              new Date(String(v)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              if (name === "revenue") return [formatCurrency(n), "Revenue"];
              if (name === "visitors") return [formatNumber(n), "Visitors"];
              return [formatNumber(n), String(name)];
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2.2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Money Gap score + revenue-at-risk from real analysis snapshots. */
export function ScoreTrendChart({
  data,
  metric = "score",
}: {
  data: ScoreTrendPoint[];
  metric?: "score" | "revenueAtRisk";
}) {
  const dataKey = metric === "score" ? "score" : "revenueAtRisk";
  const isCurrency = metric === "revenueAtRisk";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isCurrency ? "var(--gap)" : "var(--accent)"}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={isCurrency ? "var(--gap)" : "var(--accent)"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={isCurrency ? ["auto", "auto"] : [0, 100]}
            tickFormatter={(v) =>
              isCurrency ? formatNumber(v, true) : String(v)
            }
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--fg)",
            }}
            labelFormatter={(v) =>
              new Date(String(v)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              if (name === "revenueAtRisk") {
                return [formatCurrency(n), "Revenue at risk"];
              }
              if (name === "score") return [`${n}/100`, "Money Gap score"];
              return [formatNumber(n), String(name)];
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={isCurrency ? "var(--gap)" : "var(--accent)"}
            strokeWidth={2.2}
            fill="url(#scoreFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
