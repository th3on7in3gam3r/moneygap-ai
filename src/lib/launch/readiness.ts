import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { workspaceLaunchAcks } from "@/db/schema";
import { isTrustEngineEnabled, isMaintenanceMode } from "@/lib/observability/logger";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { isPlatform10Enabled } from "@/lib/launch/flag";

export type LaunchCheckStatus = "pass" | "fail" | "manual" | "warn";

export type LaunchCheck = {
  id: string;
  title: string;
  category: "deployment" | "security" | "performance" | "launch" | "monitoring";
  status: LaunchCheckStatus;
  detail: string;
  probeable: boolean;
  acked: boolean;
};

function envSet(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim().length > 0;
}

export async function probeDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function getLaunchReadiness(input: {
  workspaceId: string;
}): Promise<{
  enabled: boolean;
  message: string | null;
  checks: LaunchCheck[];
  summary: { pass: number; fail: number; warn: number; manual: number; acked: number };
}> {
  if (!isPlatform10Enabled()) {
    return {
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      checks: [],
      summary: { pass: 0, fail: 0, warn: 0, manual: 0, acked: 0 },
    };
  }

  const acks = await db.query.workspaceLaunchAcks.findMany({
    where: eq(workspaceLaunchAcks.workspaceId, input.workspaceId),
  });
  const ackSet = new Set(acks.map((a) => a.checkId));

  const dbOk = await probeDatabase();
  const stripeOk = isStripeConfigured();
  const trustOn = isTrustEngineEnabled();
  const maintenance = isMaintenanceMode();

  const checks: LaunchCheck[] = [
    {
      id: "database_url",
      title: "DATABASE_URL configured",
      category: "deployment",
      status: envSet("DATABASE_URL") && dbOk ? "pass" : "fail",
      detail: dbOk ? "Database reachable" : "Database probe failed or URL missing",
      probeable: true,
      acked: ackSet.has("database_url"),
    },
    {
      id: "clerk_keys",
      title: "Clerk keys present",
      category: "deployment",
      status:
        envSet("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && envSet("CLERK_SECRET_KEY")
          ? "pass"
          : "warn",
      detail: "Required for authenticated dashboard",
      probeable: true,
      acked: ackSet.has("clerk_keys"),
    },
    {
      id: "ai_keys",
      title: "OpenAI / Firecrawl keys",
      category: "deployment",
      status: envSet("OPENAI_API_KEY") ? "pass" : "warn",
      detail: envSet("FIRECRAWL_API_KEY")
        ? "OpenAI set; Firecrawl set"
        : "OpenAI and/or Firecrawl may be missing",
      probeable: true,
      acked: ackSet.has("ai_keys"),
    },
    {
      id: "cron_secret",
      title: "CRON_SECRET set",
      category: "deployment",
      status: envSet("CRON_SECRET") ? "pass" : "warn",
      detail: "Protects Monitor and Agency report crons",
      probeable: true,
      acked: ackSet.has("cron_secret"),
    },
    {
      id: "integration_encryption",
      title: "INTEGRATION_ENCRYPTION_KEY set",
      category: "security",
      status: envSet("INTEGRATION_ENCRYPTION_KEY") ? "pass" : "warn",
      detail: "Required for Integration Hub credential vault",
      probeable: true,
      acked: ackSet.has("integration_encryption"),
    },
    {
      id: "api_key_hashing",
      title: "API keys hashed only",
      category: "security",
      status: "manual",
      detail: "Confirm api_keys store key_hash only (architecture)",
      probeable: false,
      acked: ackSet.has("api_key_hashing"),
    },
    {
      id: "workspace_isolation",
      title: "Workspace isolation reviewed",
      category: "security",
      status: "manual",
      detail: "Confirm all report/API queries scope by workspace",
      probeable: false,
      acked: ackSet.has("workspace_isolation"),
    },
    {
      id: "mfa_clerk",
      title: "Enforce MFA in Clerk",
      category: "security",
      status: "manual",
      detail: "Enable MFA policies in Clerk Dashboard (no custom TOTP)",
      probeable: false,
      acked: ackSet.has("mfa_clerk"),
    },
    {
      id: "maintenance_mode_off",
      title: "Maintenance mode off for launch",
      category: "launch",
      status: maintenance ? "fail" : "pass",
      detail: maintenance
        ? "MAINTENANCE_MODE is on — dashboard/API degraded"
        : "MAINTENANCE_MODE off",
      probeable: true,
      acked: ackSet.has("maintenance_mode_off"),
    },
    {
      id: "trust_engine",
      title: "Trust Engine enabled",
      category: "launch",
      status: trustOn ? "pass" : "warn",
      detail: trustOn
        ? "FEATURE_TRUST_ENGINE on (or default)"
        : "Trust Engine disabled",
      probeable: true,
      acked: ackSet.has("trust_engine"),
    },
    {
      id: "stripe_billing",
      title: "Stripe billing configured",
      category: "launch",
      status: stripeOk ? "pass" : "warn",
      detail: stripeOk
        ? "Checkout/Portal soft-enabled"
        : "Soft plan gates only — set STRIPE_* to enable Checkout",
      probeable: true,
      acked: ackSet.has("stripe_billing"),
    },
    {
      id: "health_endpoint",
      title: "Health endpoint",
      category: "monitoring",
      status: dbOk ? "pass" : "fail",
      detail: "/api/health depends on DB",
      probeable: true,
      acked: ackSet.has("health_endpoint"),
    },
    {
      id: "owner_smoke",
      title: "Owner smoke: report + agency share",
      category: "launch",
      status: "manual",
      detail: "Run a sample report and share-link smoke test",
      probeable: false,
      acked: ackSet.has("owner_smoke"),
    },
  ];

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    manual: checks.filter((c) => c.status === "manual").length,
    acked: checks.filter((c) => c.acked).length,
  };

  return { enabled: true, message: null, checks, summary };
}

export async function ackLaunchCheck(input: {
  workspaceId: string;
  userId: string;
  checkId: string;
}) {
  const existing = await db.query.workspaceLaunchAcks.findFirst({
    where: and(
      eq(workspaceLaunchAcks.workspaceId, input.workspaceId),
      eq(workspaceLaunchAcks.checkId, input.checkId),
    ),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(workspaceLaunchAcks)
    .values({
      workspaceId: input.workspaceId,
      checkId: input.checkId,
      userId: input.userId,
    })
    .returning();
  return row;
}
