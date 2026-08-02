# Public Website Foundation™

## Mission

Launch-ready public SaaS marketing for MoneyGap AI: explain the product, build trust, support SEO, and convert visitors.

## Route map

| Path | Purpose |
| --- | --- |
| `/` | Homepage — value prop, how it works, scores, Copilot, Fix Path, Academy, FAQ, CTAs |
| `/features` | Full capability sections |
| `/pricing` | Plans, FAQ, Enterprise contact |
| `/about` | Story, mission, vision, philosophy |
| `/contact` | Form + support/sales/partnership emails |
| `/docs` | Public docs hub |
| `/security` | Security practices + disclosure |
| `/privacy` | Privacy policy scaffold (counsel review) |
| `/dashboard/settings/privacy` | Privacy Center™ (Smart Consent™, Cookie Intelligence™) |
| `/dashboard/self-optimization/privacy` | Privacy Score™ report |
| `/terms` | Terms of service scaffold (counsel review) |
| `/academy` | Growth Academy™ |
| `/integrations`, `/api`, `/marketplace` | Product area landings |

## SEO requirements

Every page uses `buildPageMetadata` (title, description, canonical, OG/Twitter). Breadcrumb JSON-LD via `MarketingPageShell` or page-level `breadcrumbJsonLd`. FAQ pages emit `faqPageJsonLd`. Root `opengraph-image` / `twitter-image` cover social previews. `/security` is in `sitemap.ts`.

## Contact form

- UI: `src/components/marketing/contact-form.tsx`
- API: `POST /api/contact`
- If `RESEND_API_KEY` is set, emails `support@moneygap-ai.com` (optional `CONTACT_FROM_EMAIL`)
- Otherwise accepts the inquiry, logs it, and returns success with direct email guidance — never fakes delivery

## Counsel review

Privacy and Terms are professional scaffolds with an explicit review banner. Finalize jurisdiction-specific language with counsel before treating them as definitive.

## Nav

- Header: Features, Growth Academy, Pricing, About
- Footer: Features, Academy, Pricing, About, Contact, Docs, Security, Privacy, Terms

## Related

- `docs/seo-intelligence.md`, `docs/crawlability-score.md`, `docs/scoring-system.md`
