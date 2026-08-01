import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { getOnboardingState, HELP_TOPICS, isPlatform10Enabled } from "@/lib/launch";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatform10Enabled()) {
    return Response.json({
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      steps: [],
      help: [],
    });
  }

  let isAgency = false;
  let workspaceId: string;
  try {
    const ctx = await loadAgencyContext();
    isAgency = ctx.isAgency;
    workspaceId = ctx.workspace.id;
  } catch {
    const { workspace } = await ensureUserAndWorkspace();
    workspaceId = workspace.id;
  }

  const onboarding = await getOnboardingState({ workspaceId, isAgency });
  return Response.json({
    ...onboarding,
    help: HELP_TOPICS,
  });
}
