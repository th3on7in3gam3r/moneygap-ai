import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  updateOnboarding,
} from "@/lib/onboarding";

const DEMO_COOKIE = "mg_demo_mode";

const schema = z.object({
  action: z.enum(["enter", "exit"]),
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
  const jar = await cookies();

  if (parsed.data.action === "enter") {
    jar.set(DEMO_COOKIE, "1", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    const updated = await updateOnboarding(workspace.id, {
      demoExploredAt: new Date(),
      status: "in_progress",
    });
    return Response.json({ ok: true, demo: true, onboarding: updated });
  }

  jar.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return Response.json({ ok: true, demo: false });
}
