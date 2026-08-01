import type { TechStackProfile } from "@/db/schema";

export type RepoFileMap = Record<string, string>;

type Hit = { layer: keyof Omit<TechStackProfile, "evidence" | "confidence">; value: string; evidence: string; weight: number };

function depsOf(pkg: Record<string, unknown> | null): Record<string, string> {
  if (!pkg) return {};
  return {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
    ...((pkg.peerDependencies as Record<string, string>) ?? {}),
  };
}

function hasDep(deps: Record<string, string>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(deps, name);
}

function hasAny(deps: Record<string, string>, names: string[]): string | null {
  for (const n of names) {
    if (hasDep(deps, n)) return n;
  }
  return null;
}

/**
 * Pure heuristic stack detection from repository file contents.
 * Safe to call from unit/smoke tests without network.
 */
export function detectTechStack(files: RepoFileMap): TechStackProfile {
  const evidence: string[] = [];
  const hits: Hit[] = [];
  let pkg: Record<string, unknown> | null = null;

  if (files["package.json"]) {
    try {
      pkg = JSON.parse(files["package.json"]) as Record<string, unknown>;
      evidence.push("Found package.json");
    } catch {
      evidence.push("package.json present but invalid JSON");
    }
  }

  const deps = depsOf(pkg);

  // Frontend
  if (hasDep(deps, "next")) {
    hits.push({ layer: "frontend", value: "Next.js", evidence: "dependency: next", weight: 30 });
  } else if (hasDep(deps, "nuxt")) {
    hits.push({ layer: "frontend", value: "Nuxt", evidence: "dependency: nuxt", weight: 28 });
  } else if (hasDep(deps, "vue") || hasDep(deps, "@vue/runtime-core")) {
    hits.push({ layer: "frontend", value: "Vue", evidence: "dependency: vue", weight: 24 });
  } else if (hasDep(deps, "svelte") || hasDep(deps, "@sveltejs/kit")) {
    hits.push({
      layer: "frontend",
      value: hasDep(deps, "@sveltejs/kit") ? "SvelteKit" : "Svelte",
      evidence: "dependency: svelte",
      weight: 24,
    });
  } else if (hasDep(deps, "react") || hasDep(deps, "react-dom")) {
    hits.push({ layer: "frontend", value: "React", evidence: "dependency: react", weight: 22 });
  }

  // Backend
  if (hasDep(deps, "@nestjs/core")) {
    hits.push({ layer: "backend", value: "NestJS", evidence: "dependency: @nestjs/core", weight: 26 });
  } else if (hasDep(deps, "express")) {
    hits.push({ layer: "backend", value: "Express", evidence: "dependency: express", weight: 22 });
  } else if (hasDep(deps, "fastify")) {
    hits.push({ layer: "backend", value: "Fastify", evidence: "dependency: fastify", weight: 22 });
  } else if (hasDep(deps, "next")) {
    hits.push({
      layer: "backend",
      value: "Next.js API / Route Handlers",
      evidence: "Next.js full-stack cues",
      weight: 18,
    });
  } else if (hasDep(deps, "hono")) {
    hits.push({ layer: "backend", value: "Hono", evidence: "dependency: hono", weight: 20 });
  }

  // ORM
  if (hasDep(deps, "drizzle-orm")) {
    hits.push({ layer: "orm", value: "Drizzle", evidence: "dependency: drizzle-orm", weight: 24 });
  } else if (hasDep(deps, "prisma") || hasDep(deps, "@prisma/client")) {
    hits.push({ layer: "orm", value: "Prisma", evidence: "dependency: prisma", weight: 24 });
  } else if (hasDep(deps, "typeorm")) {
    hits.push({ layer: "orm", value: "TypeORM", evidence: "dependency: typeorm", weight: 20 });
  } else if (hasDep(deps, "mongoose")) {
    hits.push({ layer: "orm", value: "Mongoose", evidence: "dependency: mongoose", weight: 20 });
  }

  // Database
  if (
    hasAny(deps, ["pg", "postgres", "@neondatabase/serverless", "@vercel/postgres"]) ||
    files["drizzle.config.ts"]?.includes("postgresql") ||
    files["prisma/schema.prisma"]?.includes('provider = "postgresql"')
  ) {
    hits.push({ layer: "database", value: "PostgreSQL", evidence: "postgres driver or config", weight: 22 });
  } else if (hasAny(deps, ["mysql2", "mysql"]) || files["prisma/schema.prisma"]?.includes("mysql")) {
    hits.push({ layer: "database", value: "MySQL", evidence: "mysql driver or config", weight: 20 });
  } else if (hasAny(deps, ["mongodb", "mongoose"])) {
    hits.push({ layer: "database", value: "MongoDB", evidence: "mongodb dependency", weight: 20 });
  } else if (hasAny(deps, ["better-sqlite3", "sqlite3"]) || files["prisma/schema.prisma"]?.includes("sqlite")) {
    hits.push({ layer: "database", value: "SQLite", evidence: "sqlite dependency or config", weight: 16 });
  }

  // Auth
  if (hasAny(deps, ["@clerk/nextjs", "@clerk/clerk-react", "@clerk/clerk-sdk-node"])) {
    hits.push({ layer: "auth", value: "Clerk", evidence: "dependency: @clerk/*", weight: 24 });
  } else if (hasAny(deps, ["next-auth", "@auth/core"])) {
    hits.push({ layer: "auth", value: "Auth.js / NextAuth", evidence: "dependency: next-auth", weight: 22 });
  } else if (hasAny(deps, ["@auth0/nextjs-auth0", "auth0"])) {
    hits.push({ layer: "auth", value: "Auth0", evidence: "dependency: auth0", weight: 20 });
  } else if (hasDep(deps, "supabase") || hasDep(deps, "@supabase/supabase-js")) {
    hits.push({ layer: "auth", value: "Supabase Auth", evidence: "dependency: supabase", weight: 18 });
  }

  // Hosting / deployment
  if (files["vercel.json"] || files[".vercel/project.json"]) {
    hits.push({ layer: "hosting", value: "Vercel", evidence: "vercel.json present", weight: 20 });
  } else if (files["render.yaml"] || files["render.yml"]) {
    hits.push({ layer: "hosting", value: "Render", evidence: "render.yaml present", weight: 20 });
  } else if (files["netlify.toml"]) {
    hits.push({ layer: "hosting", value: "Netlify", evidence: "netlify.toml present", weight: 18 });
  } else if (files["wrangler.toml"] || files["wrangler.jsonc"] || hasDep(deps, "wrangler")) {
    hits.push({ layer: "hosting", value: "Cloudflare Workers", evidence: "wrangler config", weight: 20 });
  } else if (files["fly.toml"]) {
    hits.push({ layer: "hosting", value: "Fly.io", evidence: "fly.toml present", weight: 16 });
  } else if (hasDep(deps, "next")) {
    hits.push({
      layer: "hosting",
      value: "Likely Vercel / Node host",
      evidence: "Next.js default hosting assumption",
      weight: 8,
    });
  }

  // Styling
  if (hasDep(deps, "tailwindcss")) {
    hits.push({ layer: "styling", value: "Tailwind CSS", evidence: "dependency: tailwindcss", weight: 18 });
  } else if (hasAny(deps, ["styled-components", "@emotion/react", "@emotion/styled"])) {
    hits.push({
      layer: "styling",
      value: hasDep(deps, "styled-components") ? "styled-components" : "Emotion",
      evidence: "CSS-in-JS dependency",
      weight: 14,
    });
  }

  // Analytics
  if (hasAny(deps, ["@vercel/analytics", "posthog-js", "@posthog/react", "mixpanel-browser"])) {
    const name = hasDep(deps, "posthog-js") || hasDep(deps, "@posthog/react")
      ? "PostHog"
      : hasDep(deps, "mixpanel-browser")
        ? "Mixpanel"
        : "Vercel Analytics";
    hits.push({ layer: "analytics", value: name, evidence: "analytics dependency", weight: 12 });
  }

  // Payments
  if (hasAny(deps, ["stripe", "@stripe/stripe-js"])) {
    hits.push({ layer: "payments", value: "Stripe", evidence: "dependency: stripe", weight: 16 });
  } else if (hasAny(deps, ["@paddle/paddle-js", "paddle-sdk"])) {
    hits.push({ layer: "payments", value: "Paddle", evidence: "dependency: paddle", weight: 14 });
  }

  // Email
  if (hasDep(deps, "resend")) {
    hits.push({ layer: "email", value: "Resend", evidence: "dependency: resend", weight: 14 });
  } else if (hasAny(deps, ["@sendgrid/mail", "nodemailer", "postmark"])) {
    const name = hasDep(deps, "@sendgrid/mail")
      ? "SendGrid"
      : hasDep(deps, "postmark")
        ? "Postmark"
        : "Nodemailer";
    hits.push({ layer: "email", value: name, evidence: "email dependency", weight: 12 });
  }

  // AI
  if (hasAny(deps, ["openai", "@ai-sdk/openai", "ai"])) {
    hits.push({ layer: "ai", value: "OpenAI / AI SDK", evidence: "openai/ai dependency", weight: 14 });
  } else if (hasAny(deps, ["@anthropic-ai/sdk", "@ai-sdk/anthropic"])) {
    hits.push({ layer: "ai", value: "Anthropic", evidence: "anthropic dependency", weight: 14 });
  } else if (hasDep(deps, "@google/generative-ai")) {
    hits.push({ layer: "ai", value: "Google Generative AI", evidence: "gemini SDK", weight: 12 });
  }

  if (files["package-lock.json"] || files["pnpm-lock.yaml"] || files["yarn.lock"] || files["bun.lockb"]) {
    evidence.push("Lockfile present");
  }
  if (files["README.md"] || files["readme.md"]) {
    evidence.push("README present");
  }

  const profile: TechStackProfile = {
    frontend: null,
    backend: null,
    database: null,
    orm: null,
    auth: null,
    hosting: null,
    styling: null,
    analytics: null,
    payments: null,
    email: null,
    ai: null,
    evidence: [],
    confidence: 0,
  };

  const byLayer = new Map<string, Hit>();
  for (const hit of hits) {
    const prev = byLayer.get(hit.layer);
    if (!prev || hit.weight > prev.weight) byLayer.set(hit.layer, hit);
  }

  let score = 0;
  for (const hit of byLayer.values()) {
    (profile as Record<string, unknown>)[hit.layer] = hit.value;
    evidence.push(hit.evidence);
    score += hit.weight;
  }

  profile.evidence = [...new Set(evidence)].slice(0, 24);
  profile.confidence = Math.min(100, Math.round(score * 0.9 + (pkg ? 5 : 0)));
  return profile;
}

/** Sample fixture helper for smoke verification */
export function detectFromPackageJson(packageJson: string): TechStackProfile {
  return detectTechStack({ "package.json": packageJson });
}
