import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  seedBusinessProfileMemory,
  updateOnboarding,
} from "@/lib/onboarding";

const schema = z.object({
  companyName: z.string().max(200).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  businessModel: z.string().max(200).optional().nullable(),
  teamSize: z.string().max(80).optional().nullable(),
  primaryGoals: z.array(z.string()).max(12).optional(),
  personaRole: z
    .enum([
      "founder",
      "ceo",
      "developer",
      "marketing",
      "sales",
      "agency",
      "consultant",
      "operations",
    ])
    .optional()
    .nullable(),
  websiteUrl: z.string().max(1000).optional().nullable(),
  currentStep: z
    .enum([
      "welcome",
      "website",
      "profile",
      "role",
      "integrations",
      "scan",
      "results",
      "complete",
    ])
    .optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIntelligentOnboardingEnabled()) {
    return Response.json({ error: "Onboarding disabled" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid profile" }, { status: 400 });
  }

  const { workspace } = await ensureUserAndWorkspace();
  await getOrCreateOnboarding(workspace.id);

  const data = parsed.data;
  const updated = await updateOnboarding(workspace.id, {
    status: "in_progress",
    companyName: data.companyName ?? undefined,
    industry: data.industry ?? undefined,
    businessModel: data.businessModel ?? undefined,
    teamSize: data.teamSize ?? undefined,
    primaryGoals: data.primaryGoals,
    personaRole: data.personaRole ?? undefined,
    primaryWebsiteUrl: data.websiteUrl ?? undefined,
    currentStep: data.currentStep ?? "profile",
  });

  await seedBusinessProfileMemory({
    workspaceId: workspace.id,
    companyName: data.companyName,
    industry: data.industry,
    businessModel: data.businessModel,
    teamSize: data.teamSize,
    primaryGoals: data.primaryGoals,
    personaRole: data.personaRole,
    websiteUrl: data.websiteUrl ?? updated?.primaryWebsiteUrl,
  });

  return Response.json({ onboarding: updated });
}
