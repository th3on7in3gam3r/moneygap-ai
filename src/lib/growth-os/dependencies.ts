import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { actionProjects, projectDependencies, reports } from "@/db/schema";

export async function listDependenciesForProjects(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  return db.query.projectDependencies.findMany({
    where: inArray(projectDependencies.projectId, projectIds),
  });
}

export async function listDependenciesForReport(reportId: string) {
  const projects = await db.query.actionProjects.findMany({
    where: eq(actionProjects.reportId, reportId),
    columns: { id: true, title: true, status: true, progress: true },
  });
  const ids = projects.map((p) => p.id);
  const deps = await listDependenciesForProjects(ids);
  return { projects, deps };
}

export async function addDependency(input: {
  projectId: string;
  dependsOnProjectId: string;
}) {
  if (input.projectId === input.dependsOnProjectId) {
    throw new Error("A project cannot depend on itself");
  }
  // Cycle check: walk dependsOn from dependsOnProjectId looking for projectId
  const all = await db.query.projectDependencies.findMany();
  const byProject = new Map<string, string[]>();
  for (const d of all) {
    const list = byProject.get(d.projectId) ?? [];
    list.push(d.dependsOnProjectId);
    byProject.set(d.projectId, list);
  }
  const provisional = byProject.get(input.projectId) ?? [];
  provisional.push(input.dependsOnProjectId);
  byProject.set(input.projectId, provisional);

  const visited = new Set<string>();
  function dfs(id: string): boolean {
    if (visited.has(id)) return true;
    visited.add(id);
    for (const next of byProject.get(id) ?? []) {
      if (dfs(next)) return true;
    }
    visited.delete(id);
    return false;
  }
  if (dfs(input.projectId)) {
    throw new Error("Dependency would create a cycle");
  }

  const [row] = await db
    .insert(projectDependencies)
    .values({
      projectId: input.projectId,
      dependsOnProjectId: input.dependsOnProjectId,
    })
    .returning();
  return row;
}

export async function removeDependency(id: string) {
  await db.delete(projectDependencies).where(eq(projectDependencies.id, id));
}

export function isProjectUnblocked(
  projectId: string,
  projects: { id: string; status: string }[],
  deps: { projectId: string; dependsOnProjectId: string }[],
): boolean {
  const statusById = new Map(projects.map((p) => [p.id, p.status]));
  const blockers = deps
    .filter((d) => d.projectId === projectId)
    .map((d) => d.dependsOnProjectId);
  return blockers.every((id) => statusById.get(id) === "completed");
}

export async function getBlockedProjectIds(reportId: string): Promise<Set<string>> {
  const { projects, deps } = await listDependenciesForReport(reportId);
  const blocked = new Set<string>();
  for (const p of projects) {
    if (!isProjectUnblocked(p.id, projects, deps)) blocked.add(p.id);
  }
  return blocked;
}

export async function getWorkspaceBlockedOpportunityIds(
  reportIds: string[],
): Promise<Set<string>> {
  const blockedOppIds = new Set<string>();
  if (reportIds.length === 0) return blockedOppIds;

  const projects = await db.query.actionProjects.findMany({
    where: inArray(actionProjects.reportId, reportIds),
  });
  const ids = projects.map((p) => p.id);
  const deps = await listDependenciesForProjects(ids);
  for (const p of projects) {
    if (!isProjectUnblocked(p.id, projects, deps) && p.opportunityId) {
      blockedOppIds.add(p.opportunityId);
    }
  }
  return blockedOppIds;
}

export async function findProjectsForWorkspace(workspaceId: string) {
  const siteReports = await db.query.reports.findMany({
    where: and(eq(reports.workspaceId, workspaceId), eq(reports.type, "intelligence")),
    columns: { id: true },
    orderBy: [desc(reports.createdAt)],
  });
  const reportIds = siteReports.map((r) => r.id);
  if (reportIds.length === 0) return [];
  return db.query.actionProjects.findMany({
    where: inArray(actionProjects.reportId, reportIds),
  });
}
