import { eq } from "drizzle-orm";
import { db } from "@/db";
import { monitorSchedules } from "@/db/schema";
import { buildGrowthBrief, shouldGenerateBrief } from "@/lib/monitor/brief";

/** Generate briefs for websites with enabled schedules and stale briefs */
export async function runDueBriefs() {
  const schedules = await db.query.monitorSchedules.findMany({
    where: eq(monitorSchedules.enabled, true),
    with: { website: true },
  });

  const created: string[] = [];
  for (const s of schedules) {
    if (!(await shouldGenerateBrief(s.websiteId, s.workspaceId))) continue;
    const name = s.website?.name ?? s.website?.domain ?? "Website";
    const brief = await buildGrowthBrief({
      workspaceId: s.workspaceId,
      websiteId: s.websiteId,
      websiteName: name,
    });
    if (brief) created.push(brief.id);
  }
  return created;
}
