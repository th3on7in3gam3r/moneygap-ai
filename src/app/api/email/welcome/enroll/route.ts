import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { enrollWelcomeSequence } from "@/lib/email/sequences/enroll-welcome";

export const runtime = "nodejs";

/** Idempotent: queue draft welcome deliveries for the current user (no Resend). */
export async function POST() {
  try {
    const { userId, workspace } = await ensureUserAndWorkspace();
    const result = await enrollWelcomeSequence({
      userId,
      workspaceId: workspace.id,
    });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Enroll failed" },
      { status: 401 },
    );
  }
}
