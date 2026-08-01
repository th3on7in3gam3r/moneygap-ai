import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  businessMemoryEntries,
  integrationConnections,
  reports,
  websites,
  workspaceMembers,
  workspaceOnboarding,
} from "@/db/schema";
import { isIntelligentOnboardingEnabled } from "@/lib/onboarding/flag";
import { getOrCreateOnboarding } from "@/lib/onboarding/state";

export type IntelligentChecklistStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  dismissed: boolean;
};

export async function getIntelligentChecklist(input: {
  workspaceId: string;
  isAgency?: boolean;
}): Promise<{
  enabled: boolean;
  message: string | null;
  steps: IntelligentChecklistStep[];
  progress: { done: number; total: number; percent: number };
  status: string | null;
  celebrateComplete: boolean;
}> {
  if (!isIntelligentOnboardingEnabled()) {
    return {
      enabled: false,
      message: "Intelligent Onboarding™ is disabled.",
      steps: [],
      progress: { done: 0, total: 0, percent: 0 },
      status: null,
      celebrateComplete: false,
    };
  }

  const row = await getOrCreateOnboarding(input.workspaceId);
  const dismissed = new Set(row?.checklistDismissed ?? []);

  const [siteRow] = await db
    .select({ value: count() })
    .from(websites)
    .where(eq(websites.workspaceId, input.workspaceId));
  const [reportRow] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.workspaceId, input.workspaceId));
  const [memRow] = await db
    .select({ value: count() })
    .from(businessMemoryEntries)
    .where(eq(businessMemoryEntries.workspaceId, input.workspaceId));
  const [memberRow] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  const connections = await db.query.integrationConnections.findMany({
    where: and(
      eq(integrationConnections.workspaceId, input.workspaceId),
      eq(integrationConnections.status, "connected"),
    ),
    limit: 40,
  });
  const slugs = new Set(connections.map((c) => c.providerSlug));

  const projects = await db.query.actionProjects.findMany({
    with: { report: true },
    limit: 80,
  });
  const hasProject = projects.some(
    (p) => p.report?.workspaceId === input.workspaceId,
  );

  const hasProfile =
    Number(memRow?.value ?? 0) > 0 ||
    !!(row?.companyName || row?.industry || (row?.primaryGoals?.length ?? 0) > 0);
  const hasScan = Number(siteRow?.value ?? 0) > 0 || !!row?.analysisId;
  const hasReport = Number(reportRow?.value ?? 0) > 0 || !!row?.reportId;
  const hasGa = slugs.has("google_analytics");
  const hasGsc = slugs.has("google_search_console");
  const hasTeam = Number(memberRow?.value ?? 0) > 1;
  const setupComplete = row?.status === "completed";

  const steps: IntelligentChecklistStep[] = [
    {
      id: "profile",
      title: "Complete Profile",
      description: "Company, industry, and goals for Business Memory™.",
      href: "/dashboard/onboarding",
      done: hasProfile,
      dismissed: dismissed.has("profile"),
    },
    {
      id: "scan",
      title: "Scan Website",
      description: "Run your first MoneyGap analysis.",
      href: "/dashboard/analyze",
      done: hasScan,
      dismissed: dismissed.has("scan"),
    },
    {
      id: "analytics",
      title: "Connect Analytics",
      description: "Google Analytics for deeper traffic context.",
      href: "/dashboard/integrations",
      done: hasGa,
      dismissed: dismissed.has("analytics"),
    },
    {
      id: "gsc",
      title: "Connect Search Console",
      description: "Unlock SEO query and coverage signals.",
      href: "/dashboard/integrations",
      done: hasGsc,
      dismissed: dismissed.has("gsc"),
    },
    {
      id: "report",
      title: "Generate First Growth Report",
      description: "Review Money Gaps and scoring.",
      href: "/dashboard/reports",
      done: hasReport,
      dismissed: dismissed.has("report"),
    },
    {
      id: "fix_path",
      title: "Review First Fix Path™",
      description: "Start an Action Project or checklist from an opportunity.",
      href: "/dashboard/money-gaps",
      done: hasProject,
      dismissed: dismissed.has("fix_path"),
    },
    {
      id: "invite",
      title: "Invite Team",
      description: "Add a teammate from Settings or Team Workspace™.",
      href: "/dashboard/team",
      done: hasTeam,
      dismissed: dismissed.has("invite"),
    },
    {
      id: "complete",
      title: "Complete Setup",
      description: "Finish Intelligent Onboarding™.",
      href: "/dashboard/onboarding",
      done: setupComplete,
      dismissed: dismissed.has("complete"),
    },
  ];

  const active = steps.filter((s) => !s.dismissed);
  const done = active.filter((s) => s.done).length;
  const total = active.length || 1;
  const percent = Math.round((done / total) * 100);
  const celebrateComplete =
    percent === 100 && !(row?.celebrationShown ?? []).includes("checklist_complete");

  return {
    enabled: true,
    message: null,
    steps,
    progress: { done, total, percent },
    status: row?.status ?? "not_started",
    celebrateComplete,
  };
}

export async function getOnboardingReminders(workspaceId: string) {
  const checklist = await getIntelligentChecklist({ workspaceId });
  const row = await db.query.workspaceOnboarding.findFirst({
    where: eq(workspaceOnboarding.workspaceId, workspaceId),
  });
  if (!row || row.status === "completed") return [];
  const dismissed = new Set(row.remindersDismissed ?? []);

  return checklist.steps
    .filter((s) => !s.done && !s.dismissed && !dismissed.has(s.id))
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      message: s.title.includes("Scan")
        ? "Complete your first scan."
        : s.id === "gsc"
          ? "Connect Google Search Console."
          : s.id === "report"
            ? "Generate your first report."
            : s.id === "invite"
              ? "Invite your team."
              : s.description,
      href: s.href,
    }));
}

/** Mark celebration as shown (idempotent). */
export async function markCelebrationShown(
  workspaceId: string,
  key: string,
) {
  const row = await getOrCreateOnboarding(workspaceId);
  if (!row) return;
  const shown = new Set(row.celebrationShown ?? []);
  if (shown.has(key)) return;
  shown.add(key);
  await db
    .update(workspaceOnboarding)
    .set({
      celebrationShown: [...shown],
      updatedAt: new Date(),
    })
    .where(eq(workspaceOnboarding.workspaceId, workspaceId));
}
