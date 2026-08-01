export function isTeamWorkspaceEnabled(): boolean {
  const v = process.env.FEATURE_TEAM_WORKSPACE;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
