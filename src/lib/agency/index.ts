export {
  hasCapability,
  normalizeRole,
  requireCapability,
  type AgencyRole,
  type Capability,
} from "@/lib/agency/permissions";
export { PLAN_LIMITS, getPlanLimits, resolvePlan } from "@/lib/agency/plans";
export { writeAuditLog } from "@/lib/agency/audit";
export {
  loadAgencyContext,
  requireAgencyPermission,
  updateWorkspaceProfile,
} from "@/lib/agency/workspace";
export {
  listClients,
  getClient,
  createClient,
  updateClient,
  getClientHistory,
  linkWebsiteToClient,
} from "@/lib/agency/clients";
export { getAgencyOverview } from "@/lib/agency/overview";
export { getBrandSettings, upsertBrandSettings } from "@/lib/agency/brand";
export {
  createShareLink,
  resolveShareToken,
  addShareComment,
  addShareApproval,
} from "@/lib/agency/share";
export { listAgencyTemplates, ensureAgencyTemplatesSeeded } from "@/lib/agency/templates";
export { askAgencyAdvisor } from "@/lib/agency/advisor";
export {
  upsertClientReportSchedule,
  buildClientScheduledReport,
  runDueClientReports,
} from "@/lib/agency/client-reports";
