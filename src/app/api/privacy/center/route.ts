import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  businessGoals,
  integrationConnections,
  reports,
  websiteAnalyses,
  websites,
} from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  getLatestConsent,
  listConsentEvents,
  CONSENT_SCHEMA_VERSION,
  PRIVACY_POLICY_VERSION,
} from "@/lib/privacy";

export const runtime = "nodejs";

export async function GET() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let workspaceId: string | null = null;
  let workspaceName: string | null = null;
  try {
    const ctx = await loadAgencyContext();
    workspaceId = ctx.workspace.id;
    workspaceName = ctx.workspace.name;
  } catch {
    /* no workspace */
  }

  const consent = await getLatestConsent({ userId, workspaceId });
  const events = await listConsentEvents({ userId, workspaceId, limit: 50 });

  let integrations: { provider: string; status: string }[] = [];
  const tallies: Record<string, number> = {};
  if (workspaceId) {
    const rows = await db.query.integrationConnections.findMany({
      where: eq(integrationConnections.workspaceId, workspaceId),
      columns: { providerSlug: true, status: true },
    });
    integrations = rows.map((r) => ({
      provider: r.providerSlug,
      status: r.status,
    }));

    const [w] = await db
      .select({ n: count() })
      .from(websites)
      .where(eq(websites.workspaceId, workspaceId));
    const [a] = await db
      .select({ n: count() })
      .from(websiteAnalyses)
      .where(eq(websiteAnalyses.workspaceId, workspaceId));
    const [r] = await db
      .select({ n: count() })
      .from(reports)
      .where(eq(reports.workspaceId, workspaceId));
    const [g] = await db
      .select({ n: count() })
      .from(businessGoals)
      .where(eq(businessGoals.workspaceId, workspaceId));
    tallies.websites = Number(w?.n ?? 0);
    tallies.analyses = Number(a?.n ?? 0);
    tallies.reports = Number(r?.n ?? 0);
    tallies.goals = Number(g?.n ?? 0);
  }

  const processors = [
    { name: "Clerk", purpose: "Authentication & sessions", active: true },
    {
      name: "Neon",
      purpose: "Primary database",
      active: Boolean(process.env.DATABASE_URL),
    },
    {
      name: "Stripe",
      purpose: "Subscriptions & billing",
      active: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    {
      name: "Resend",
      purpose: "Transactional email",
      active: Boolean(process.env.RESEND_API_KEY),
    },
  ];

  return Response.json({
    workspaceName,
    consentSchemaVersion: CONSENT_SCHEMA_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    consent,
    events,
    integrations,
    storedDataSummary: tallies,
    processors,
  });
}
