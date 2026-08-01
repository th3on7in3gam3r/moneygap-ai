export type GapSeverity = "critical" | "high" | "medium" | "low";

export type GapCategory =
  | "conversion"
  | "pricing"
  | "checkout"
  | "retention"
  | "traffic"
  | "messaging";

export type DailyPoint = {
  date: string;
  visitors: number;
  conversions: number;
  revenue: number;
  bounceRate: number;
};
