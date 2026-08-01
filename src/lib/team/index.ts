export { isTeamWorkspaceEnabled } from "@/lib/team/flag";
export {
  loadTeamContext,
  requireTeamFeature,
  requireTeamCapability,
  requireClientScope,
  listScopedWebsiteIds,
  assertReportInClientScope,
  type TeamContext,
} from "@/lib/team/scope";
export {
  createInvite,
  revokeInvite,
  acceptInvite,
  getInviteByToken,
  listInvites,
  inviteUrlPath,
} from "@/lib/team/invites";
export {
  listOpportunityComments,
  addOpportunityComment,
  listOpportunityApprovals,
  submitOpportunityApproval,
  linkProjectSprint,
  assignProject,
} from "@/lib/team/collaboration";
export { listAuditTimeline } from "@/lib/team/audit-read";
