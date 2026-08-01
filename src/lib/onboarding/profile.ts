import type { OnboardingPersonaRole } from "@/db/schema";
import { upsertMemoryEntry } from "@/lib/copilot/memory";
import { createGoal, listActiveGoals } from "@/lib/growth-os/goals";
import { GOAL_OPTIONS } from "@/lib/onboarding/constants";

export async function seedBusinessProfileMemory(input: {
  workspaceId: string;
  companyName?: string | null;
  industry?: string | null;
  businessModel?: string | null;
  teamSize?: string | null;
  primaryGoals?: string[];
  personaRole?: OnboardingPersonaRole | null;
  websiteUrl?: string | null;
}) {
  const entries: { key: string; text: string }[] = [];

  if (input.companyName?.trim()) {
    entries.push({
      key: "company_name",
      text: `Company name: ${input.companyName.trim()}`,
    });
  }
  if (input.industry?.trim()) {
    entries.push({
      key: "industry",
      text: `Industry: ${input.industry.trim()}`,
    });
  }
  if (input.businessModel?.trim()) {
    entries.push({
      key: "business_model",
      text: `Business model: ${input.businessModel.trim()}`,
    });
  }
  if (input.teamSize?.trim()) {
    entries.push({
      key: "team_size",
      text: `Team size: ${input.teamSize.trim()}`,
    });
  }
  if (input.personaRole) {
    entries.push({
      key: "persona_role",
      text: `Primary user role: ${input.personaRole}`,
    });
  }
  if (input.websiteUrl?.trim()) {
    entries.push({
      key: "primary_website",
      text: `Primary website: ${input.websiteUrl.trim()}`,
    });
  }
  if (input.primaryGoals?.length) {
    const labels = input.primaryGoals
      .map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.label ?? id)
      .join(", ");
    entries.push({
      key: "primary_goals",
      text: `Primary growth goals: ${labels}`,
    });
  }

  for (const e of entries) {
    await upsertMemoryEntry({
      workspaceId: input.workspaceId,
      kind: "fact",
      key: e.key,
      value: { text: e.text },
      source: "onboarding",
      confidence: 90,
    });
  }

  const existing = await listActiveGoals(input.workspaceId);
  const existingTitles = new Set(existing.map((g) => g.title.toLowerCase()));

  for (const goalId of input.primaryGoals ?? []) {
    const opt = GOAL_OPTIONS.find((g) => g.id === goalId);
    if (!opt) continue;
    if (existingTitles.has(opt.label.toLowerCase())) continue;
    await createGoal({
      workspaceId: input.workspaceId,
      title: opt.label,
      type: opt.goalType,
      priority: 70,
    });
  }

  return { memoryKeys: entries.map((e) => e.key) };
}
