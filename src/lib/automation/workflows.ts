import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  actionProjectTasks,
  automationWorkflowRuns,
  automationWorkflows,
  moneyGapOpportunities,
  type AutomationWorkflowKind,
} from "@/db/schema";
import { loadAutomationContext } from "@/lib/automation/context";
import { agentSlugForModule, type AgentSlug } from "@/lib/automation/flag";
import { buildWorkflowSteps } from "@/lib/automation/workflow-build";

function inferKind(
  agentSlug: string,
  category: string,
  title: string,
): AutomationWorkflowKind {
  const blob = `${agentSlug} ${category} ${title}`.toLowerCase();
  if (/review|testimonial|trust/.test(blob)) return "reviews";
  if (/onboard|welcome|customer/.test(blob)) return "onboarding";
  if (/nurture|drip|sequence/.test(blob)) return "nurture";
  if (/email|newsletter|resend/.test(blob)) return "email";
  if (/crm|hubspot|salesforce|lead/.test(blob)) return "crm";
  if (agentSlug === "automation") return "internal";
  if (agentSlug === "marketing") return "email";
  return "internal";
}

export { buildWorkflowSteps } from "@/lib/automation/workflow-build";

export async function generateWorkflow(input: {
  workspaceId: string;
  userId: string;
  opportunityId: string;
  agentSlug?: AgentSlug | string;
}) {
  const opportunity = await db.query.moneyGapOpportunities.findFirst({
    where: eq(moneyGapOpportunities.id, input.opportunityId),
  });
  if (!opportunity) {
    return { ok: false as const, error: "Opportunity not found", status: 404 as const };
  }

  const agentSlug =
    input.agentSlug || agentSlugForModule(opportunity.moduleId);
  const ctx = await loadAutomationContext(
    input.workspaceId,
    opportunity.reportId,
  );
  const kind = inferKind(agentSlug, opportunity.category, opportunity.title);
  const steps = buildWorkflowSteps({
    title: opportunity.title,
    agentSlug,
    kind,
    whatsMissing: opportunity.whatsMissing,
    contextNotes: ctx.notes,
  });

  const [workflow] = await db
    .insert(automationWorkflows)
    .values({
      workspaceId: input.workspaceId,
      opportunityId: opportunity.id,
      agentSlug,
      title: `Workflow: ${opportunity.title}`,
      kind,
      steps,
      status: "draft",
      meta: {
        contextNotes: ctx.notes,
        hasTechProfile: ctx.hasTechProfile,
      },
    })
    .returning();

  return { ok: true as const, workflow: workflow! };
}

export async function getWorkflowDetail(workspaceId: string, id: string) {
  const workflow = await db.query.automationWorkflows.findFirst({
    where: and(
      eq(automationWorkflows.id, id),
      eq(automationWorkflows.workspaceId, workspaceId),
    ),
  });
  if (!workflow) return null;
  const runs = await db.query.automationWorkflowRuns.findMany({
    where: eq(automationWorkflowRuns.workflowId, id),
  });
  return { workflow, runs };
}

export async function runWorkflow(input: {
  workspaceId: string;
  userId: string;
  workflowId: string;
}) {
  const detail = await getWorkflowDetail(input.workspaceId, input.workflowId);
  if (!detail) {
    return { ok: false as const, error: "Workflow not found", status: 404 as const };
  }

  let projectId = detail.workflow.projectId;
  if (!projectId && detail.workflow.opportunityId) {
    const opportunity = await db.query.moneyGapOpportunities.findFirst({
      where: eq(moneyGapOpportunities.id, detail.workflow.opportunityId),
    });
    if (opportunity) {
      const existing = await db.query.actionProjects.findFirst({
        where: and(
          eq(actionProjects.opportunityId, opportunity.id),
          eq(actionProjects.reportId, opportunity.reportId),
        ),
      });
      if (existing) {
        projectId = existing.id;
      } else {
        const [project] = await db
          .insert(actionProjects)
          .values({
            reportId: opportunity.reportId,
            opportunityId: opportunity.id,
            userId: input.userId,
            title: detail.workflow.title,
            status: "active",
            priority: opportunity.severity,
            progress: 0,
            businessImpact: opportunity.businessImpact,
            estimatedCompletion: opportunity.estimatedTime,
            playbook: "generic",
          })
          .returning();
        projectId = project!.id;
        await db.insert(actionProjectTasks).values(
          detail.workflow.steps.steps.map((s, index) => ({
            projectId: projectId!,
            title: s.title,
            sortOrder: index,
            completed: false,
          })),
        );
        await db
          .update(moneyGapOpportunities)
          .set({
            implementationStatus: "in_progress",
            lifecycleStatus: "in_progress",
            status: "in_progress",
          })
          .where(eq(moneyGapOpportunities.id, opportunity.id));
      }
      await db
        .update(automationWorkflows)
        .set({
          projectId,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(automationWorkflows.id, detail.workflow.id));
    }
  }

  const [run] = await db
    .insert(automationWorkflowRuns)
    .values({
      workflowId: detail.workflow.id,
      status: "completed",
      summary:
        "Draft run recorded. Action Project tasks created or linked — no external publish.",
      meta: { projectId },
    })
    .returning();

  return { ok: true as const, run: run!, projectId };
}
