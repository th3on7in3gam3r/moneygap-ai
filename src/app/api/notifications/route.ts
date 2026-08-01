import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";

    const rows = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.workspaceId, workspace.id),
        ...(unreadOnly ? [isNull(notifications.readAt)] : []),
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: 40,
    });

    const unreadCount = rows.filter((n) => !n.readAt).length;

    return Response.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Clear all notifications for the current user in this workspace. */
export async function DELETE() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.workspaceId, workspace.id),
        ),
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not clear notifications" }, { status: 500 });
  }
}
