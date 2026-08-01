import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { websites } from "@/db/schema";

export type WorkspaceWebsite = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

export async function listWorkspaceWebsites(
  workspaceId: string,
): Promise<WorkspaceWebsite[]> {
  const sites = await db.query.websites.findMany({
    where: eq(websites.workspaceId, workspaceId),
    orderBy: [desc(websites.updatedAt)],
  });
  return sites.map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    url: s.url,
  }));
}

export function resolveFocusWebsite(
  sites: WorkspaceWebsite[],
  preferredId?: string | null,
): WorkspaceWebsite | null {
  if (sites.length === 0) return null;
  if (preferredId) {
    const match = sites.find((s) => s.id === preferredId);
    if (match) return match;
  }
  return sites[0] ?? null;
}
