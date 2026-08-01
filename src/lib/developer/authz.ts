import type { loadAgencyContext } from "@/lib/agency/workspace";

type AgencyContext = Awaited<ReturnType<typeof loadAgencyContext>>;

export function canManageDeveloperMode(ctx: AgencyContext): boolean {
  const isOwner = ctx.workspace.ownerId === ctx.userId;
  return isOwner || ctx.role === "owner" || ctx.role === "admin";
}

export function requireExplicitAuthorize(body: { authorize?: unknown }): boolean {
  return body.authorize === true;
}
