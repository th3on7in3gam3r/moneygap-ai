import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enterpriseSettings } from "@/db/schema";

export async function getOrCreateEnterpriseSettings(workspaceId: string) {
  const existing = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.workspaceId, workspaceId),
  });
  if (existing) return existing;

  const [row] = await db
    .insert(enterpriseSettings)
    .values({ workspaceId })
    .returning();
  return row;
}

export async function updateEnterpriseSettings(input: {
  workspaceId: string;
  ssoEnabled?: boolean;
  ssoProvider?: string | null;
  dataRetentionDays?: number;
  dedicatedEnvironment?: boolean;
  auditExportEnabled?: boolean;
  notes?: string | null;
}) {
  await getOrCreateEnterpriseSettings(input.workspaceId);
  const [row] = await db
    .update(enterpriseSettings)
    .set({
      ...(input.ssoEnabled !== undefined ? { ssoEnabled: input.ssoEnabled } : {}),
      ...(input.ssoProvider !== undefined ? { ssoProvider: input.ssoProvider } : {}),
      ...(input.dataRetentionDays !== undefined
        ? { dataRetentionDays: input.dataRetentionDays }
        : {}),
      ...(input.dedicatedEnvironment !== undefined
        ? { dedicatedEnvironment: input.dedicatedEnvironment }
        : {}),
      ...(input.auditExportEnabled !== undefined
        ? { auditExportEnabled: input.auditExportEnabled }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(enterpriseSettings.workspaceId, input.workspaceId))
    .returning();
  return row;
}
