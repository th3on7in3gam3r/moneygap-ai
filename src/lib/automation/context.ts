import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationConnections, websiteClassifications } from "@/db/schema";
import { getLatestConfidenceSnapshot } from "@/lib/confidence/snapshots";
import { getTechProfile } from "@/lib/developer/memory";

export type AutomationContextPack = {
  industrySlug: string | null;
  businessModelSlug: string | null;
  hasTechProfile: boolean;
  techFrontend: string | null;
  confidenceOverall: number | null;
  hubAutomationConnected: boolean;
  notes: string[];
};

export async function loadAutomationContext(
  workspaceId: string,
  reportId?: string | null,
): Promise<AutomationContextPack> {
  const notes: string[] = [];
  let industrySlug: string | null = null;
  let businessModelSlug: string | null = null;
  let hasTechProfile = false;
  let techFrontend: string | null = null;
  let confidenceOverall: number | null = null;
  let hubAutomationConnected = false;

  try {
    if (reportId) {
      const cls = await db.query.websiteClassifications.findFirst({
        where: eq(websiteClassifications.reportId, reportId),
      });
      industrySlug = cls?.industrySlug ?? null;
      businessModelSlug = cls?.businessModelSlug ?? null;
      if (industrySlug) notes.push(`Industry: ${industrySlug}`);
      if (businessModelSlug) notes.push(`Business model: ${businessModelSlug}`);
    }
  } catch {
    notes.push("Knowledge Graph context unavailable");
  }

  try {
    const tech = await getTechProfile(workspaceId);
    if (tech?.stack) {
      hasTechProfile = true;
      techFrontend = tech.stack.frontend ?? null;
      notes.push(
        `Project Memory: ${tech.stack.frontend ?? "stack"} (${tech.confidence}% conf)`,
      );
    } else {
      notes.push("No Project Memory — Developer Agent soft-baseline");
    }
  } catch {
    notes.push("Project Memory soft-fail");
  }

  try {
    const snap = await getLatestConfidenceSnapshot(workspaceId);
    confidenceOverall = snap?.overallScore ?? null;
    if (confidenceOverall != null) {
      notes.push(`Confidence Intelligence overall: ${confidenceOverall}%`);
    }
  } catch {
    /* soft */
  }

  try {
    const hub = await db.query.integrationConnections.findMany({
      where: and(
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.status, "connected"),
      ),
    });
    // Zapier / Make / n8n style — check by slug if present
    hubAutomationConnected = hub.some((c) =>
      ["zapier", "make", "n8n"].includes(c.providerSlug),
    );
    if (hubAutomationConnected) {
      notes.push("Integration Hub automation connector connected");
    }
  } catch {
    /* soft */
  }

  return {
    industrySlug,
    businessModelSlug,
    hasTechProfile,
    techFrontend,
    confidenceOverall,
    hubAutomationConnected,
    notes,
  };
}
