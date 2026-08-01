import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websites, workspaceMembers } from "@/db/schema";

export async function assertWebsiteAccess(websiteId: string, userId: string) {
  const site = await db.query.websites.findFirst({
    where: eq(websites.id, websiteId),
  });
  if (!site) return null;

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, site.workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });
  if (!membership) return null;

  return { website: site, workspaceId: site.workspaceId };
}
