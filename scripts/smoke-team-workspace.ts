/**
 * Smoke checks for Phase 21 Team Workspace™ (no DB).
 * Run: npx tsx scripts/smoke-team-workspace.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  hasCapability,
  isClientRole,
  normalizeRole,
} from "../src/lib/agency/permissions";
import { isTeamWorkspaceEnabled } from "../src/lib/team/flag";

assert.equal(normalizeRole("member"), "analyst");
assert.equal(normalizeRole("client"), "client");
assert.equal(normalizeRole("executive"), "executive");
assert.equal(isClientRole("client"), true);
assert.equal(isClientRole("analyst"), false);

assert.equal(hasCapability("client", "viewOwnClient"), true);
assert.equal(hasCapability("client", "viewClients"), false);
assert.equal(hasCapability("client", "manageTeam"), false);
assert.equal(hasCapability("executive", "viewAudit"), true);
assert.equal(hasCapability("executive", "manageTeam"), false);
assert.equal(hasCapability("marketing", "manageClients"), true);
assert.equal(hasCapability("marketing", "viewBilling"), false);
assert.equal(hasCapability("developer", "manageProjects"), true);
assert.equal(hasCapability("owner", "manageInvites"), true);

const prev = process.env.FEATURE_TEAM_WORKSPACE;
process.env.FEATURE_TEAM_WORKSPACE = "0";
assert.equal(isTeamWorkspaceEnabled(), false);
process.env.FEATURE_TEAM_WORKSPACE = "1";
assert.equal(isTeamWorkspaceEnabled(), true);
delete process.env.FEATURE_TEAM_WORKSPACE;
assert.equal(isTeamWorkspaceEnabled(), true);
if (prev !== undefined) process.env.FEATURE_TEAM_WORKSPACE = prev;

const token = randomBytes(32).toString("hex");
assert.equal(token.length, 64);
assert.equal(`/invite/${token}`.startsWith("/invite/"), true);

console.log("smoke-team-workspace: ok");
