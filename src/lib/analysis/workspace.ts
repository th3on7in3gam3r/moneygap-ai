import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function ensureUserAndWorkspace() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("UNAUTHORIZED");
  }

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@users.clerk`;

  await db
    .insert(users)
    .values({
      id: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    });

  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, clerkUser.id),
    with: { workspace: true },
  });

  if (memberships.length > 0) {
    const preferred =
      memberships.find((m) => m.role === "client" && m.workspace) ||
      memberships.find(
        (m) =>
          m.workspace &&
          (m.workspace.type === "agency" || m.workspace.type === "enterprise"),
      ) ||
      memberships.find((m) => m.workspace);
    if (preferred?.workspace) {
      return {
        userId: clerkUser.id,
        workspace: preferred.workspace,
      };
    }
  }

  const baseName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "Workspace";
  const name = `${baseName}'s Workspace`;
  const slugBase = slugify(baseName) || "workspace";
  const slug = `${slugBase}-${clerkUser.id.slice(-6)}`;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name,
      slug,
      ownerId: clerkUser.id,
      plan: "free",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: clerkUser.id,
    role: "owner",
  });

  return { userId: clerkUser.id, workspace };
}
