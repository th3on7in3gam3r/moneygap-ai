# Intelligent Onboarding™ (Phase 20.7)

## Mission

Guide every new user from signup to their first actionable Growth Report with minimal friction—and an early “Aha!” via MoneyGap Engine™, Fix Paths™, and Growth Copilot™.

## Feature flag

`FEATURE_INTELLIGENT_ONBOARDING` — default **on**. Set `0` / `false` / `off` to disable the gate and APIs.

## Flow

1. Welcome — Start Setup / Explore Demo / Skip  
2. Website URL + lightweight discovery (SSL, DNS, hosting/CMS/framework heuristics, meta)  
3. Business profile → Business Memory™ + goals  
4. Role → Copilot mode mapping  
5. Optional Integration Hub™ connect (GitHub/Stripe live; others pending)  
6. AI scan via existing `POST` analysis pipeline + progress UI  
7. First results (score, top opportunity, AI Estimate range, Fix Path)  
8. Copilot welcome thread + complete  

## Persistence

Table `workspace_onboarding` — status, step, persona, discovery signals, analysis/report/thread ids, checklist/reminder dismissals, demo/completed/skipped timestamps.

## APIs

| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/onboarding` | State, checklist, reminders; skip/replay/reset/dismiss |
| `POST /api/onboarding/discover` | Background website discovery |
| `POST /api/onboarding/profile` | Profile + memory + goals |
| `POST /api/onboarding/start-scan` | Start MoneyGap analysis |
| `POST /api/onboarding/link-report` | Attach report to onboarding |
| `POST /api/onboarding/complete` | Mark complete + seed Copilot greeting |
| `POST /api/onboarding/demo` | Enter/exit demo cookie |

## Gate

`OnboardingGate` in dashboard layout redirects `not_started` / `in_progress` to `/dashboard/onboarding` (allowlist: onboarding, billing, settings, docs).

## Related docs

- [business-profile.md](./business-profile.md)
- [first-scan.md](./first-scan.md)
- [demo-workspace.md](./demo-workspace.md)
- [onboarding-checklist.md](./onboarding-checklist.md)
