# Stack Intelligence™

## Mission

Detect the user’s technology stack from repository manifests so implementation plans and blueprints fit the real architecture.

## Phase

Part of **Phase 15 — Developer Mode™ & Stack Intelligence™** (brief “Phase 13”).

## Detection layers

| Layer | Example signals |
| --- | --- |
| Frontend | `next`, `react`, `vue`, `nuxt`, `svelte` in package.json |
| Backend | `express`, `nestjs`, `fastify`, Next API routes |
| Database | `postgres`, `mysql`, `mongodb`, `sqlite` deps / env cues |
| ORM | `drizzle-orm`, `prisma`, `@prisma/client`, `typeorm` |
| Authentication | `@clerk/nextjs`, `next-auth`, `auth0` |
| Hosting | `vercel.json`, `render.yaml`, `netlify.toml`, `wrangler` |
| Styling | `tailwindcss`, `styled-components`, `@emotion` |
| Analytics | `@vercel/analytics`, `posthog`, `ga` |
| Payments | `stripe`, `@paddle` |
| Email | `resend`, `@sendgrid`, `nodemailer` |
| AI | `openai`, `@anthropic`, `@ai-sdk` |

## Confidence

Heuristic score 0–100 from number of high-signal matches + presence of lockfile/README. Evidence strings stored for transparency.

## Output

`TechStackProfile` on `workspace_tech_profiles.stack` — used by Implementation Planner™ and AI Blueprint Generator™.

## Code

`src/lib/developer/stack-detect.ts` — pure heuristics over fetched file contents.

See [`developer-mode.md`](./developer-mode.md), [`project-memory.md`](./project-memory.md).
