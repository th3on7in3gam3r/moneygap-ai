export type ScanProfile = "quick" | "standard" | "deep" | "enterprise";

export type ScanPhase =
  | "queued"
  | "estimating"
  | "discovering"
  | "processing"
  | "paused"
  | "waiting"
  | "analyzing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export type CrawlPageState =
  | "queued"
  | "processing"
  | "completed"
  | "retry"
  | "failed"
  | "skipped"
  | "cancelled";

export type ScanProfileConfig = {
  id: ScanProfile;
  label: string;
  description: string;
  crawlerMode: "quick" | "standard" | "deep";
  maxPages: number;
  batchSize: number;
  concurrency: number;
  maxDepth: number;
  /** Seconds-per-page heuristic for ETA */
  secondsPerPage: number;
};

export type EstimateResult = {
  url: string;
  domain: string;
  estimatedPages: number;
  complexity: "low" | "medium" | "high";
  framework: string;
  sitemapFound: boolean;
  jsRequired: boolean;
  recommendedProfile: ScanProfile;
  guidance: string;
  estimatedCostUnits: number;
  etaByProfile: Record<
    ScanProfile,
    { label: string; etaSeconds: number; etaLabel: string }
  >;
  signals: {
    sitemapUrlCount: number;
    homepageLinkCount: number;
    robotsFound: boolean;
  };
  /** Full staged connectivity diagnostics (Pre-Scan foundation). */
  connectivity?: import("./connectivity/types").ConnectivityDiagnostics;
  warnings?: string[];
};
