export type AgencyRole =
  | "owner"
  | "admin"
  | "executive"
  | "marketing"
  | "developer"
  | "analyst"
  | "client_manager"
  | "viewer"
  | "client"
  | "member"; // legacy

export type Capability =
  | "manageClients"
  | "runReports"
  | "editRecommendations"
  | "viewBilling"
  | "manageTeam"
  | "manageBrand"
  | "viewClients"
  | "manageWorkspace"
  | "viewOwnClient"
  | "commentOwnClient"
  | "approveOwnClient"
  | "viewAudit"
  | "viewExecutive"
  | "manageProjects"
  | "manageInvites";

const ROLE_CAPS: Record<string, Capability[]> = {
  owner: [
    "manageClients",
    "runReports",
    "editRecommendations",
    "viewBilling",
    "manageTeam",
    "manageBrand",
    "viewClients",
    "manageWorkspace",
    "viewAudit",
    "viewExecutive",
    "manageProjects",
    "manageInvites",
  ],
  admin: [
    "manageClients",
    "runReports",
    "editRecommendations",
    "viewBilling",
    "manageTeam",
    "manageBrand",
    "viewClients",
    "manageWorkspace",
    "viewAudit",
    "viewExecutive",
    "manageProjects",
    "manageInvites",
  ],
  executive: [
    "viewClients",
    "runReports",
    "viewBilling",
    "viewAudit",
    "viewExecutive",
    "manageProjects",
  ],
  marketing: [
    "manageClients",
    "runReports",
    "editRecommendations",
    "viewClients",
    "manageProjects",
    "manageInvites",
  ],
  developer: [
    "viewClients",
    "runReports",
    "editRecommendations",
    "manageProjects",
  ],
  analyst: ["runReports", "editRecommendations", "viewClients", "manageProjects"],
  client_manager: [
    "manageClients",
    "runReports",
    "editRecommendations",
    "viewClients",
    "manageProjects",
    "manageInvites",
  ],
  viewer: ["viewClients"],
  member: ["runReports", "editRecommendations", "viewClients", "manageProjects"],
  client: ["viewOwnClient", "commentOwnClient", "approveOwnClient"],
};

export type NormalizedRole = Exclude<AgencyRole, "member">;

export function normalizeRole(role: string): NormalizedRole {
  if (role === "member") return "analyst";
  if (
    role === "owner" ||
    role === "admin" ||
    role === "executive" ||
    role === "marketing" ||
    role === "developer" ||
    role === "analyst" ||
    role === "client_manager" ||
    role === "viewer" ||
    role === "client"
  ) {
    return role;
  }
  return "viewer";
}

export function hasCapability(role: string, cap: Capability): boolean {
  const caps = ROLE_CAPS[role] ?? ROLE_CAPS[normalizeRole(role)] ?? [];
  return caps.includes(cap);
}

export function requireCapability(role: string, cap: Capability): boolean {
  return hasCapability(role, cap);
}

export function isClientRole(role: string): boolean {
  return normalizeRole(role) === "client";
}

export const INVITE_STAFF_ROLES = [
  "admin",
  "executive",
  "marketing",
  "developer",
  "analyst",
  "client_manager",
  "viewer",
] as const;

export type InviteStaffRole = (typeof INVITE_STAFF_ROLES)[number];
