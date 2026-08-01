import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getFirstResultsSummary,
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  updateOnboarding,
} from "@/lib/onboarding";

const schema = z.object({
  reportId: z.string().uuid(),
  analysisId: z.string().uuid().optional(),
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
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { workspace } = await ensureUserAndWorkspace();
  await getOrCreateOnboarding(workspace.id);
  const updated = await updateOnboarding(workspace.id, {
    reportId: parsed.data.reportId,
    analysisId: parsed.data.analysisId,
    currentStep: "results",
    status: "in_progress",
  });
  const firstResults = await getFirstResultsSummary(parsed.data.reportId);
  return Response.json({ onboarding: updated, firstResults });
}
