import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { automationAgents } from "@/db/schema";
import { SEED_AGENTS } from "@/lib/automation/flag";

export async function ensureAutomationAgents() {
  const existing = await db.query.automationAgents.findMany();
  if (existing.length >= SEED_AGENTS.length) return existing;

  for (const a of SEED_AGENTS) {
    const found = existing.find((e) => e.slug === a.slug);
    if (found) continue;
    await db.insert(automationAgents).values({
      slug: a.slug,
      name: a.name,
      moduleIds: [...a.moduleIds],
      description: a.description,
      status: "active",
      sortOrder: a.sortOrder,
    });
  }

  return db.query.automationAgents.findMany({
    orderBy: [asc(automationAgents.sortOrder)],
  });
}

export async function listAutomationAgents() {
  await ensureAutomationAgents();
  return db.query.automationAgents.findMany({
    where: eq(automationAgents.status, "active"),
    orderBy: [asc(automationAgents.sortOrder)],
  });
}
