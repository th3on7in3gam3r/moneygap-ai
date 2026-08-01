import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { developerRepos } from "@/db/schema";
import {
  DeveloperGithubError,
  fetchGithubFileContent,
  getGithubAccessToken,
  listGithubRepos,
} from "@/lib/developer/github-api";
import { detectTechStack, type RepoFileMap } from "@/lib/developer/stack-detect";
import { upsertTechProfile } from "@/lib/developer/memory";
import { writeDeveloperAudit } from "@/lib/developer/audit";

const KEY_PATHS = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "README.md",
  "readme.md",
  "vercel.json",
  "render.yaml",
  "render.yml",
  "netlify.toml",
  "wrangler.toml",
  "wrangler.jsonc",
  "fly.toml",
  "drizzle.config.ts",
  "prisma/schema.prisma",
  "tsconfig.json",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
] as const;

export async function syncGithubRepos(input: {
  workspaceId: string;
  userId: string;
}) {
  const token = await getGithubAccessToken(input.workspaceId);
  if (!token) {
    return {
      ok: false as const,
      error:
        "GitHub is not connected. Connect it in Integration Hub, then sync again.",
      status: 503 as const,
    };
  }

  try {
    const remote = await listGithubRepos(token);
    const upserted = [];
    for (const r of remote.slice(0, 100)) {
      const existing = await db.query.developerRepos.findFirst({
        where: and(
          eq(developerRepos.workspaceId, input.workspaceId),
          eq(developerRepos.fullName, r.full_name),
        ),
      });
      if (existing) {
        const [row] = await db
          .update(developerRepos)
          .set({
            defaultBranch: r.default_branch || existing.defaultBranch,
            htmlUrl: r.html_url,
            status: "synced",
            meta: {
              ...(existing.meta ?? {}),
              private: r.private,
              language: r.language,
              description: r.description,
              remoteUpdatedAt: r.updated_at,
            },
            updatedAt: new Date(),
          })
          .where(eq(developerRepos.id, existing.id))
          .returning();
        upserted.push(row!);
      } else {
        const [row] = await db
          .insert(developerRepos)
          .values({
            workspaceId: input.workspaceId,
            provider: "github",
            fullName: r.full_name,
            defaultBranch: r.default_branch || "main",
            htmlUrl: r.html_url,
            status: "synced",
            meta: {
              private: r.private,
              language: r.language,
              description: r.description,
              remoteUpdatedAt: r.updated_at,
            },
          })
          .returning();
        upserted.push(row!);
      }
    }

    await writeDeveloperAudit({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "developer_repos_sync",
      meta: { count: upserted.length },
    });

    return { ok: true as const, repos: upserted };
  } catch (e) {
    const msg =
      e instanceof DeveloperGithubError
        ? e.message
        : "Could not sync GitHub repositories";
    return { ok: false as const, error: msg, status: 502 as const };
  }
}

export async function listDeveloperRepos(workspaceId: string) {
  return db.query.developerRepos.findMany({
    where: eq(developerRepos.workspaceId, workspaceId),
    orderBy: [desc(developerRepos.isPrimary), desc(developerRepos.updatedAt)],
  });
}

export async function setPrimaryRepo(workspaceId: string, repoId: string) {
  await db
    .update(developerRepos)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(eq(developerRepos.workspaceId, workspaceId));
  const [row] = await db
    .update(developerRepos)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(
      and(eq(developerRepos.id, repoId), eq(developerRepos.workspaceId, workspaceId)),
    )
    .returning();
  return row ?? null;
}

export async function fetchRepoKeyFiles(
  workspaceId: string,
  fullName: string,
  ref?: string,
): Promise<{ files: RepoFileMap; token: string } | { error: string; status: number }> {
  const token = await getGithubAccessToken(workspaceId);
  if (!token) {
    return {
      error:
        "GitHub is not connected. Connect it in Integration Hub, then analyze again.",
      status: 503,
    };
  }
  const files: RepoFileMap = {};
  for (const path of KEY_PATHS) {
    const content = await fetchGithubFileContent(token, fullName, path, ref);
    if (content) files[path] = content;
  }
  return { files, token };
}

export async function analyzeDeveloperRepo(input: {
  workspaceId: string;
  userId: string;
  repoId: string;
}) {
  const repo = await db.query.developerRepos.findFirst({
    where: and(
      eq(developerRepos.id, input.repoId),
      eq(developerRepos.workspaceId, input.workspaceId),
    ),
  });
  if (!repo) {
    return { ok: false as const, error: "Repository not found", status: 404 as const };
  }

  try {
    const fetched = await fetchRepoKeyFiles(
      input.workspaceId,
      repo.fullName,
      repo.defaultBranch,
    );
    if ("error" in fetched) {
      return {
        ok: false as const,
        error: fetched.error,
        status: fetched.status as 503,
      };
    }

    const stack = detectTechStack(fetched.files);
    const profile = await upsertTechProfile({
      workspaceId: input.workspaceId,
      stack,
      sourceRepoId: repo.id,
    });

    await db
      .update(developerRepos)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(developerRepos.workspaceId, input.workspaceId));

    await db
      .update(developerRepos)
      .set({
        isPrimary: true,
        status: "analyzed",
        lastAnalyzedAt: new Date(),
        meta: {
          ...(repo.meta ?? {}),
          analyzedFiles: Object.keys(fetched.files),
          confidence: stack.confidence,
        },
        updatedAt: new Date(),
      })
      .where(eq(developerRepos.id, repo.id));

    await writeDeveloperAudit({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "developer_repo_analyze",
      repoId: repo.id,
      meta: { confidence: stack.confidence, layers: stack },
    });

    return { ok: true as const, stack, profile, repoId: repo.id };
  } catch (e) {
    await db
      .update(developerRepos)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(developerRepos.id, repo.id));
    const msg =
      e instanceof DeveloperGithubError ? e.message : "Analyze failed";
    return { ok: false as const, error: msg, status: 502 as const };
  }
}
