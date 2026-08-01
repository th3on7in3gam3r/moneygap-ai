import type { loadAgencyContext } from "@/lib/agency/workspace";
import { hasCapability } from "@/lib/agency/permissions";

/** Workspace owners and roles that can manage projects may drive Automation Studio. */
export function canManageAutomation(
  ctx: Awaited<ReturnType<typeof loadAgencyContext>>,
): boolean {
  if (ctx.workspace.ownerId === ctx.userId) return true;
  if (ctx.role === "owner" || ctx.role === "admin") return true;
  return hasCapability(ctx.role, "manageProjects");
}
