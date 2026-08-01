import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  discoverWebsiteSignals,
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  updateOnboarding,
} from "@/lib/onboarding";

const schema = z.object({
  url: z.string().min(1),
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
    return Response.json({ error: "Enter a website URL." }, { status: 400 });
  }

  const { workspace } = await ensureUserAndWorkspace();
  await getOrCreateOnboarding(workspace.id);

  await updateOnboarding(workspace.id, {
    status: "in_progress",
    currentStep: "website",
    primaryWebsiteUrl: parsed.data.url.trim(),
    discoverySignals: { error: null },
  });

  // Run discovery after response so the wizard can continue immediately.
  after(async () => {
    try {
      const signals = await discoverWebsiteSignals(parsed.data.url);
      await updateOnboarding(workspace.id, {
        discoverySignals: signals,
        primaryWebsiteUrl: parsed.data.url.trim(),
      });
    } catch (e) {
      await updateOnboarding(workspace.id, {
        discoverySignals: {
          error: e instanceof Error ? e.message : "Discovery failed",
          completedAt: new Date().toISOString(),
        },
      });
    }
  });

  return Response.json({ ok: true, started: true });
}
