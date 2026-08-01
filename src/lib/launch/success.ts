import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, websites, workspaceMembers } from "@/db/schema";
import { isPlatform10Enabled } from "@/lib/launch/flag";
import { getIntelligentChecklist } from "@/lib/onboarding/checklist";
import { isIntelligentOnboardingEnabled } from "@/lib/onboarding/flag";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

export async function getOnboardingState(input: {
  workspaceId: string;
  isAgency: boolean;
}): Promise<{
  enabled: boolean;
  message: string | null;
  steps: OnboardingStep[];
  progress: { done: number; total: number; percent?: number };
}> {
  if (isIntelligentOnboardingEnabled()) {
    const checklist = await getIntelligentChecklist({
      workspaceId: input.workspaceId,
      isAgency: input.isAgency,
    });
    return {
      enabled: checklist.enabled,
      message: checklist.message,
      steps: checklist.steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        href: s.href,
        done: s.done,
      })),
      progress: {
        done: checklist.progress.done,
        total: checklist.progress.total,
        percent: checklist.progress.percent,
      },
    };
  }

  if (!isPlatform10Enabled()) {
    return {
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      steps: [],
      progress: { done: 0, total: 0 },
    };
  }

  const [siteRow] = await db
    .select({ value: count() })
    .from(websites)
    .where(eq(websites.workspaceId, input.workspaceId));
  const [reportRow] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.workspaceId, input.workspaceId));

  const projects = await db.query.actionProjects.findMany({
    with: { report: true },
    limit: 80,
  });
  const projectCount = projects.filter(
    (p) => p.report?.workspaceId === input.workspaceId,
  ).length;

  const [memberRow] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  const hasSite = Number(siteRow?.value ?? 0) > 0;
  const hasReport = Number(reportRow?.value ?? 0) > 0;
  const hasProject = projectCount > 0;
  const hasTeam = Number(memberRow?.value ?? 0) > 1;

  const steps: OnboardingStep[] = [
    {
      id: "analyze",
      title: "Analyze a website",
      description: "Run Website Intelligence on a public URL.",
      href: "/dashboard/analyze",
      done: hasSite,
    },
    {
      id: "report",
      title: "Open a report",
      description: "Review Money Gaps and Fix Paths.",
      href: "/dashboard/reports",
      done: hasReport,
    },
    {
      id: "action",
      title: "Start an Action Project",
      description: "Create a project or checklist from an opportunity.",
      href: "/dashboard/money-gaps",
      done: hasProject,
    },
  ];

  if (input.isAgency) {
    steps.push({
      id: "invite",
      title: "Invite a teammate or client",
      description: "Use Team Workspace™ or Clients invite.",
      href: "/dashboard/team",
      done: hasTeam,
    });
  }

  steps.push({
    id: "onboarding",
    title: "Intelligent Onboarding™",
    description: "Welcome, profile, first scan, and Copilot greeting.",
    href: "/dashboard/onboarding",
    done: hasReport && hasSite,
  });

  const done = steps.filter((s) => s.done).length;
  return {
    enabled: true,
    message: null,
    steps,
    progress: {
      done,
      total: steps.length,
      percent: Math.round((done / steps.length) * 100),
    },
  };
}

export const HELP_TOPICS = [
  {
    id: "growth-chain",
    title: "Growth chain",
    body: "Every finding must connect Visibility → Traffic → Leads → Customers → Revenue → Growth.",
  },
  {
    id: "fix-paths",
    title: "Fix Paths",
    body: "Choose Action Center, checklist, Developer/AI, Automation, Hub, or Advisor—never auto-publish.",
  },
  {
    id: "onboarding",
    title: "Intelligent Onboarding™",
    body: "Replay setup anytime from Settings or Success Center. Demo Workspace uses Aurora sample data.",
  },
];
