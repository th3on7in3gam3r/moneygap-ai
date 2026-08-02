/**
 * Creates MoneyGap Sandbox Stripe products + recurring prices, upserts price IDs
 * into .env.local, and ensures the production webhook endpoint exists.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/setup-stripe-catalog.ts
 *
 * Requires STRIPE_SECRET_KEY (sk_test_... for Sandbox).
 * Optionally writes STRIPE_WEBHOOK_SECRET when creating the webhook endpoint.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import Stripe from "stripe";
import { PLAN_CATALOG, type PlanId } from "../src/lib/billing/catalog";

const WEBHOOK_URL = "https://moneygap-ai.com/api/billing/webhooks";
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const PAID_PLANS = PLAN_CATALOG.filter(
  (p) => p.id !== "free" && p.monthlyPriceCents > 0,
);

const ENV_PATH = resolve(process.cwd(), ".env.local");

function lookupKey(planId: PlanId, interval: "monthly" | "annual") {
  return `moneygap_${planId}_${interval}`;
}

function envKey(planId: PlanId, interval: "monthly" | "annual") {
  const suffix = interval === "annual" ? "ANNUAL" : "MONTHLY";
  return `STRIPE_PRICE_${planId.toUpperCase()}_${suffix}`;
}

function upsertEnv(vars: Record<string, string>) {
  let text = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue;
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      if (!text.endsWith("\n") && text.length > 0) text += "\n";
      text += `${line}\n`;
    }
  }
  writeFileSync(ENV_PATH, text, "utf8");
}

async function findOrCreateProduct(
  stripe: Stripe,
  planId: PlanId,
  name: string,
  description: string,
) {
  const existing = await stripe.products.search({
    query: `metadata['moneygap_plan_id']:'${planId}' AND active:'true'`,
    limit: 1,
  });
  if (existing.data[0]) {
    console.log(`  product exists: ${existing.data[0].id} (${planId})`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name: `MoneyGap AI — ${name}`,
    description,
    metadata: {
      moneygap_plan_id: planId,
      app: "moneygap-ai",
    },
  });
  console.log(`  product created: ${product.id} (${planId})`);
  return product;
}

async function findOrCreatePrice(
  stripe: Stripe,
  productId: string,
  planId: PlanId,
  interval: "monthly" | "annual",
  unitAmount: number,
) {
  const key = lookupKey(planId, interval);
  const listed = await stripe.prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  });
  if (listed.data[0]) {
    console.log(`  price exists: ${listed.data[0].id} (${key})`);
    return listed.data[0];
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: {
      interval: interval === "annual" ? "year" : "month",
    },
    lookup_key: key,
    metadata: {
      moneygap_plan_id: planId,
      billing_interval: interval,
      app: "moneygap-ai",
    },
  });
  console.log(`  price created: ${price.id} (${key}) $${(unitAmount / 100).toFixed(2)}`);
  return price;
}

async function ensureWebhook(stripe: Stripe) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = endpoints.data.find((e) => e.url === WEBHOOK_URL);
  if (match) {
    console.log(`  webhook exists: ${match.id}`);
    console.log(
      "  (signing secret already issued — paste from Dashboard if STRIPE_WEBHOOK_SECRET is empty)",
    );
    return { id: match.id, secret: null as string | null };
  }

  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "MoneyGap AI billing (Checkout + subscriptions)",
    metadata: { app: "moneygap-ai" },
  });
  console.log(`  webhook created: ${created.id}`);
  return { id: created.id, secret: created.secret ?? null };
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error(
      "Missing STRIPE_SECRET_KEY. Paste your Sandbox sk_test_... into .env.local, then re-run:",
    );
    console.error(
      "  npx tsx --env-file=.env.local scripts/setup-stripe-catalog.ts",
    );
    process.exit(1);
  }
  if (!secret.startsWith("sk_test_") && !secret.startsWith("sk_live_")) {
    console.error("STRIPE_SECRET_KEY does not look like a Stripe secret key.");
    process.exit(1);
  }
  if (secret.startsWith("sk_live_")) {
    console.warn(
      "WARNING: using a LIVE secret key. Prefer Sandbox sk_test_ until Checkout is verified.",
    );
  }

  const stripe = new Stripe(secret);

  console.log("\n=== Products & prices ===\n");
  const priceEnv: Record<string, string> = {};

  for (const plan of PAID_PLANS) {
    console.log(`${plan.name} (${plan.id})`);
    const product = await findOrCreateProduct(
      stripe,
      plan.id,
      plan.name,
      plan.description,
    );
    const monthly = await findOrCreatePrice(
      stripe,
      product.id,
      plan.id,
      "monthly",
      plan.monthlyPriceCents,
    );
    const annual = await findOrCreatePrice(
      stripe,
      product.id,
      plan.id,
      "annual",
      plan.annualPriceCents,
    );
    priceEnv[envKey(plan.id, "monthly")] = monthly.id;
    priceEnv[envKey(plan.id, "annual")] = annual.id;
  }

  console.log("\n=== Webhook ===\n");
  const webhook = await ensureWebhook(stripe);
  if (webhook.secret) {
    priceEnv.STRIPE_WEBHOOK_SECRET = webhook.secret;
    console.log("  wrote STRIPE_WEBHOOK_SECRET from new endpoint");
  }

  upsertEnv(priceEnv);
  console.log(`\nUpdated ${ENV_PATH} with ${Object.keys(priceEnv).length} keys.`);
  console.log("\nPrice IDs:");
  for (const [k, v] of Object.entries(priceEnv)) {
    if (k.startsWith("STRIPE_PRICE_")) console.log(`  ${k}=${v}`);
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    console.log(
      "\nReminder: set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_test_...) in .env.local and Vercel.",
    );
  }

  if (process.argv.includes("--vercel")) {
    const { execFileSync } = await import("child_process");
    const all = {
      STRIPE_SECRET_KEY: secret,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "",
      STRIPE_WEBHOOK_SECRET:
        priceEnv.STRIPE_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
        "",
      ...priceEnv,
    };
    console.log("\n=== Pushing to Vercel (production + preview + development) ===\n");
    for (const [key, value] of Object.entries(all)) {
      if (!value) {
        console.log(`  skip ${key} (empty)`);
        continue;
      }
      const targets: Array<{ env: string; extra: string[] }> = [
        { env: "production", extra: [] },
        // Empty git-branch arg = all Preview branches (required in agent/non-interactive CLI)
        { env: "preview", extra: [""] },
        { env: "development", extra: [] },
      ];
      for (const { env, extra } of targets) {
        try {
          const out = execFileSync(
            "vercel",
            ["env", "add", key, env, ...extra, "--value", value, "--force", "--yes"],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          );
          if (
            out.includes("action_required") ||
            out.includes('"status": "error"')
          ) {
            console.error(`  failed ${key} ${env}: ${out.trim()}`);
          } else {
            console.log(`  ${key} → ${env}`);
          }
        } catch (err) {
          const msg =
            err && typeof err === "object" && "stderr" in err
              ? String((err as { stderr?: string }).stderr || "")
              : err instanceof Error
                ? err.message
                : String(err);
          console.error(`  failed ${key} ${env}: ${msg.trim() || "unknown"}`);
        }
      }
    }
  }

  console.log("\nDone. Restart the Next.js app, then test /dashboard/billing Checkout.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
