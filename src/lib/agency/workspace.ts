import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  hasCapability,
  normalizeRole,
  type Capability,
} from "@/lib/agency/permissions";
import { getPlanLimits } from "@/lib/agency/plans";

export async function loadAgencyContext() {
  const { userId, workspace } = await ensureUserAndWorkspace();
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspace.id),
      eq(workspaceMembers.userId, userId),
    ),
  });
  const role = normalizeRole(membership?.role ?? "viewer");
  const isAgency =
    workspace.type === "agency" || workspace.type === "enterprise";
  return {
    userId,
    workspace,
    membership,
    role,
    isAgency,
    planLimits: getPlanLimits(workspace.plan),
  };
}

export async function requireAgencyPermission(cap: Capability) {
  const ctx = await loadAgencyContext();
  if (!hasCapability(ctx.role, cap)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden", ctx };
  }
  return { ok: true as const, ctx };
}

export async function updateWorkspaceProfile(input: {
  workspaceId: string;
  type?: string;
  name?: string;
  agencyName?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  plan?: string;
}) {
  const [row] = await db
    .update(workspaces)
    .set({
      ...(input.type ? { type: input.type } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.agencyName !== undefined ? { agencyName: input.agencyName } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl } : {}),
      ...(input.contactEmail !== undefined
        ? { contactEmail: input.contactEmail }
        : {}),
      ...(input.plan ? { plan: input.plan } : {}),
    })
    .where(eq(workspaces.id, input.workspaceId))
    .returning();
  return row;
}
