import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getFirstResultsSummary,
  getIntelligentChecklist,
  getOnboardingReminders,
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  markCelebrationShown,
  ONBOARDING_STEPS,
  updateOnboarding,
} from "@/lib/onboarding";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIntelligentOnboardingEnabled()) {
    return Response.json({
      enabled: false,
      message: "Intelligent Onboarding™ is disabled (FEATURE_INTELLIGENT_ONBOARDING).",
    });
  }

  const { workspace } = await ensureUserAndWorkspace();
  const row = await getOrCreateOnboarding(workspace.id);
  const checklist = await getIntelligentChecklist({ workspaceId: workspace.id });
  const reminders = await getOnboardingReminders(workspace.id);

  let firstResults = null;
  if (row?.reportId) {
    firstResults = await getFirstResultsSummary(row.reportId);
  }

  return Response.json({
    enabled: true,
    onboarding: row,
    checklist,
    reminders,
    firstResults,
    steps: ONBOARDING_STEPS,
  });
}

const patchSchema = z.object({
  action: z.enum([
    "advance",
    "skip",
    "replay",
    "reset",
    "dismiss_reminder",
    "dismiss_checklist",
    "celebration_ack",
    "set_step",
  ]),
  step: z
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
  id: z.string().optional(),
  key: z.string().optional(),
});

export async function PATCH(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIntelligentOnboardingEnabled()) {
    return Response.json({ error: "Onboarding disabled" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { workspace } = await ensureUserAndWorkspace();
  const row = await getOrCreateOnboarding(workspace.id);
  if (!row) {
    return Response.json({ error: "Could not load onboarding" }, { status: 500 });
  }

  const { action } = parsed.data;

  if (action === "skip") {
    const updated = await updateOnboarding(workspace.id, {
      status: "skipped",
      skippedAt: new Date(),
      currentStep: "welcome",
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "replay") {
    const updated = await updateOnboarding(workspace.id, {
      status: "in_progress",
      currentStep: "welcome",
      completedAt: null,
      skippedAt: null,
      replayCount: (row.replayCount ?? 0) + 1,
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "reset") {
    const updated = await updateOnboarding(workspace.id, {
      status: "not_started",
      currentStep: "welcome",
      completedAt: null,
      skippedAt: null,
      analysisId: null,
      reportId: null,
      welcomeThreadId: null,
      discoverySignals: null,
      replayCount: (row.replayCount ?? 0) + 1,
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "set_step" || action === "advance") {
    const step = parsed.data.step;
    if (!step) {
      return Response.json({ error: "step required" }, { status: 400 });
    }
    const updated = await updateOnboarding(workspace.id, {
      status: row.status === "not_started" ? "in_progress" : row.status,
      currentStep: step,
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "dismiss_reminder" && parsed.data.id) {
    const set = new Set(row.remindersDismissed ?? []);
    set.add(parsed.data.id);
    const updated = await updateOnboarding(workspace.id, {
      remindersDismissed: [...set],
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "dismiss_checklist" && parsed.data.id) {
    const set = new Set(row.checklistDismissed ?? []);
    set.add(parsed.data.id);
    const updated = await updateOnboarding(workspace.id, {
      checklistDismissed: [...set],
    });
    return Response.json({ onboarding: updated });
  }

  if (action === "celebration_ack" && parsed.data.key) {
    await markCelebrationShown(workspace.id, parsed.data.key);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
