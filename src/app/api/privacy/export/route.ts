import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, websiteAnalyses, websites } from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  CONSENT_SCHEMA_VERSION,
  PRIVACY_POLICY_VERSION,
  getLatestConsent,
  listConsentEvents,
} from "@/lib/privacy";

export const runtime = "nodejs";

export async function GET() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let workspaceId: string | null = null;
  try {
    const ctx = await loadAgencyContext();
    workspaceId = ctx.workspace.id;
  } catch {
    workspaceId = null;
  }

  const consent = await getLatestConsent({ userId, workspaceId });
  const events = await listConsentEvents({ userId, workspaceId, limit: 40 });

  const tallies: Record<string, number> = {};
  if (workspaceId) {
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
    tallies.websites = Number(w?.n ?? 0);
    tallies.analyses = Number(a?.n ?? 0);
    tallies.reports = Number(r?.n ?? 0);
  }

  const processors = [
    { name: "Clerk", purpose: "Authentication", active: true },
    {
      name: "Neon",
      purpose: "Application database",
      active: Boolean(process.env.DATABASE_URL),
    },
    {
      name: "Stripe",
      purpose: "Billing (when enabled)",
      active: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    {
      name: "Resend",
      purpose: "Transactional email (when enabled)",
      active: Boolean(process.env.RESEND_API_KEY),
    },
    {
      name: "Vercel / hosting",
      purpose: "Application hosting and edge delivery",
      active: true,
    },
  ];

  return Response.json({
    exportedAt: new Date().toISOString(),
    userId,
    workspaceId,
    consentSchemaVersion: CONSENT_SCHEMA_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    consent: consent
      ? {
          categories: consent.categories,
          policyVersion: consent.policyVersion,
          consentVersion: consent.consentVersion,
          source: consent.source,
          updatedAt: consent.updatedAt,
        }
      : null,
    consentTimeline: events.map((e) => ({
      eventType: e.eventType,
      categoriesEnabled: e.categoriesEnabled,
      categoriesDisabled: e.categoriesDisabled,
      categories: e.categories,
      policyVersion: e.policyVersion,
      consentVersion: e.consentVersion,
      source: e.source,
      createdAt: e.createdAt,
    })),
    storedDataSummary: tallies,
    processors,
    counselNotice:
      "This export is an operational snapshot, not a legal certification. Review with counsel for regulatory requests.",
  });
}
