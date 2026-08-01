import type {
  IntegrationCategory,
  IntegrationConnection,
  IntegrationHealthSnapshot,
} from "@/db/schema";

const CRITICAL: IntegrationCategory[] = [
  "analytics",
  "crm",
  "email",
  "payments",
];

const STALE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function computeIntegrationHealth(input: {
  connections: IntegrationConnection[];
  providerCategories: Record<string, IntegrationCategory>;
}): IntegrationHealthSnapshot {
  const active = input.connections.filter(
    (c) => c.status === "connected" || c.status === "error" || c.status === "pending",
  );
  const connected = input.connections.filter((c) => c.status === "connected");
  const errors = input.connections.filter((c) => c.status === "error");
  const now = Date.now();
  const stale = connected.filter((c) => {
    if (!c.lastSyncAt) return true;
    return now - new Date(c.lastSyncAt).getTime() > STALE_MS;
  });

  const connectedCategories = new Set(
    connected
      .map((c) => input.providerCategories[c.providerSlug])
      .filter(Boolean),
  );
  const missingCritical = CRITICAL.filter((cat) => !connectedCategories.has(cat));

  let score = 40;
  score += Math.min(30, connected.length * 5);
  score -= Math.min(25, errors.length * 10);
  score -= Math.min(15, stale.length * 5);
  score -= Math.min(20, missingCritical.length * 5);
  score = Math.max(0, Math.min(100, score));

  if (active.length === 0) score = Math.min(score, 25);

  return {
    score,
    connectedCount: connected.length,
    staleCount: stale.length,
    errorCount: errors.length,
    missingCritical,
    evaluatedAt: new Date().toISOString(),
  };
}
