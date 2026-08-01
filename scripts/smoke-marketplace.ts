/**
 * Smoke checks for Phase 22 Marketplace™ (no DB).
 * Run: npx tsx scripts/smoke-marketplace.ts
 */
import assert from "node:assert/strict";
import { isMarketplaceEnabled } from "../src/lib/marketplace/flag";
import {
  MARKETPLACE_EVENTS,
  validateManifest,
} from "../src/lib/marketplace/plugin-sdk/manifest";

const prev = process.env.FEATURE_MARKETPLACE;
process.env.FEATURE_MARKETPLACE = "0";
assert.equal(isMarketplaceEnabled(), false);
process.env.FEATURE_MARKETPLACE = "1";
assert.equal(isMarketplaceEnabled(), true);
delete process.env.FEATURE_MARKETPLACE;
assert.equal(isMarketplaceEnabled(), true);
if (prev !== undefined) process.env.FEATURE_MARKETPLACE = prev;

assert.ok(MARKETPLACE_EVENTS.includes("listing.installed"));

const bad = validateManifest({});
assert.equal(bad.ok, false);

const good = validateManifest({
  id: "demo-pack",
  name: "Demo",
  version: "1.0.0",
  category: "industry_packs",
  capabilities: ["install", "pack"],
  source: { kgIndustrySlug: "saas" },
});
assert.equal(good.ok, true);
if (good.ok) {
  assert.equal(good.manifest.id, "demo-pack");
}

console.log("smoke-marketplace: ok");
