/**
 * Smoke checks for Phase 23 Platform 1.0™ (no DB).
 * Run: npx tsx scripts/smoke-platform-1.0.ts
 */
import assert from "node:assert/strict";
import { isPlatform10Enabled } from "../src/lib/launch/flag";
import { isStripeConfigured } from "../src/lib/billing/stripe";
import {
  checkRateLimit,
  clearRateLimitBuckets,
} from "../src/lib/security/rate-limit";
import { listDocCatalog } from "../src/lib/launch/docs-catalog";

const prev = process.env.FEATURE_PLATFORM_1_0;
process.env.FEATURE_PLATFORM_1_0 = "0";
assert.equal(isPlatform10Enabled(), false);
process.env.FEATURE_PLATFORM_1_0 = "1";
assert.equal(isPlatform10Enabled(), true);
delete process.env.FEATURE_PLATFORM_1_0;
assert.equal(isPlatform10Enabled(), true);
if (prev !== undefined) process.env.FEATURE_PLATFORM_1_0 = prev;

// Stripe off without keys
delete process.env.STRIPE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
assert.equal(isStripeConfigured(), false);

clearRateLimitBuckets();
assert.equal(checkRateLimit({ key: "t", limit: 2, windowMs: 60_000 }).ok, true);
assert.equal(checkRateLimit({ key: "t", limit: 2, windowMs: 60_000 }).ok, true);
assert.equal(checkRateLimit({ key: "t", limit: 2, windowMs: 60_000 }).ok, false);

assert.ok(listDocCatalog().length >= 8);
assert.ok(listDocCatalog("security").some((d) => d.slug === "security"));

console.log("smoke-platform-1.0: ok");
