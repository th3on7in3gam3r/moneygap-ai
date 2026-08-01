import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  agencyBrandSettings,
  clients,
  moneyGapOpportunities,
  reports,
  websites,
} from "@/db/schema";
import { loadTeamContext, requireTeamFeature } from "@/lib/team";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({
      enabled: false,
      message: feature.error,
    });
  }

  const ctx = await loadTeamContext();
  if (!ctx.isClient || !ctx.clientId) {
    return Response.json({ error: "Client role required" }, { status: 403 });
  }

  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, ctx.clientId),
      eq(clients.workspaceId, ctx.workspace.id),
    ),
  });
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const brand = await db.query.agencyBrandSettings.findFirst({
    where: eq(agencyBrandSettings.workspaceId, ctx.workspace.id),
  });

  const siteRows = await db.query.websites.findMany({
    where: and(
      eq(websites.workspaceId, ctx.workspace.id),
      eq(websites.clientId, ctx.clientId),
    ),
  });
  const websiteIds = siteRows.map((s) => s.id);

  const reportRows =
    websiteIds.length === 0
      ? []
      : await db.query.reports.findMany({
          where: and(
            eq(reports.workspaceId, ctx.workspace.id),
            inArray(reports.websiteId, websiteIds),
          ),
          orderBy: [desc(reports.createdAt)],
          limit: 20,
        });

  const reportIds = reportRows.map((r) => r.id);
  const opportunities =
    reportIds.length === 0
      ? []
      : await db.query.moneyGapOpportunities.findMany({
          where: inArray(moneyGapOpportunities.reportId, reportIds),
          orderBy: [desc(moneyGapOpportunities.createdAt)],
          limit: 40,
        });

  const projects =
    reportIds.length === 0
      ? []
      : await db.query.actionProjects.findMany({
          where: inArray(actionProjects.reportId, reportIds),
          orderBy: [desc(actionProjects.updatedAt)],
          limit: 30,
        });

  return Response.json({
    enabled: true,
    client: {
      id: client.id,
      name: client.name,
      websiteUrl: client.websiteUrl,
      industry: client.industry,
    },
    brand: brand
      ? {
          companyName: brand.companyName,
          logoUrl: brand.logoUrl,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor,
          contactInfo: brand.contactInfo,
          reportFooter: brand.reportFooter,
          showPoweredBy: brand.showPoweredBy,
        }
      : {
          companyName: ctx.workspace.agencyName || ctx.workspace.name,
          logoUrl: null,
          primaryColor: null,
          accentColor: null,
          contactInfo: ctx.workspace.contactEmail,
          reportFooter: null,
          showPoweredBy: true,
        },
    reports: reportRows.map((r) => ({
      id: r.id,
      title: r.title,
      moneyGapScore: r.moneyGapScore,
      revenueAtRisk: r.revenueAtRisk,
      createdAt: r.createdAt.toISOString(),
    })),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      reportId: o.reportId,
      title: o.title,
      category: o.category,
      whatsMissing: o.whatsMissing,
      implementationStatus: o.implementationStatus,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      reportId: p.reportId,
      opportunityId: p.opportunityId,
      title: p.title,
      status: p.status,
      progress: p.progress,
      sprintId: p.sprintId,
    })),
  });
}
