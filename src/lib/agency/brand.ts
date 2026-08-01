import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencyBrandSettings } from "@/db/schema";
import { writeAuditLog } from "@/lib/agency/audit";

export async function getBrandSettings(workspaceId: string) {
  return db.query.agencyBrandSettings.findFirst({
    where: eq(agencyBrandSettings.workspaceId, workspaceId),
  });
}

export async function upsertBrandSettings(input: {
  workspaceId: string;
  actorUserId: string;
  logoUrl?: string | null;
  companyName?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  contactInfo?: string | null;
  reportFooter?: string | null;
  showPoweredBy?: boolean;
}) {
  const existing = await getBrandSettings(input.workspaceId);
  if (existing) {
    const [row] = await db
      .update(agencyBrandSettings)
      .set({
        logoUrl: input.logoUrl !== undefined ? input.logoUrl : existing.logoUrl,
        companyName:
          input.companyName !== undefined ? input.companyName : existing.companyName,
        primaryColor:
          input.primaryColor !== undefined ? input.primaryColor : existing.primaryColor,
        accentColor:
          input.accentColor !== undefined ? input.accentColor : existing.accentColor,
        contactInfo:
          input.contactInfo !== undefined ? input.contactInfo : existing.contactInfo,
        reportFooter:
          input.reportFooter !== undefined ? input.reportFooter : existing.reportFooter,
        showPoweredBy:
          input.showPoweredBy !== undefined
            ? input.showPoweredBy
            : existing.showPoweredBy,
        updatedAt: new Date(),
      })
      .where(eq(agencyBrandSettings.id, existing.id))
      .returning();
    await writeAuditLog({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: "brand.update",
      entityType: "agency_brand",
      entityId: row.id,
    });
    return row;
  }

  const [row] = await db
    .insert(agencyBrandSettings)
    .values({
      workspaceId: input.workspaceId,
      logoUrl: input.logoUrl ?? null,
      companyName: input.companyName ?? null,
      primaryColor: input.primaryColor ?? null,
      accentColor: input.accentColor ?? null,
      contactInfo: input.contactInfo ?? null,
      reportFooter: input.reportFooter ?? null,
      showPoweredBy: input.showPoweredBy ?? true,
    })
    .returning();

  await writeAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: "brand.create",
    entityType: "agency_brand",
    entityId: row.id,
  });
  return row;
}
