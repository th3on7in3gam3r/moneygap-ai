import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gaArticles, gaArticleCategories, gaCategories } from "@/db/schema";
import type { GaFaqItem } from "@/db/schema";
import {
  ensureDefaultAuthor,
  ensureGrowthAcademyCatalog,
} from "./service";
import { estimateReadingTimeMinutes } from "./slug";

const SAMPLES: {
  title: string;
  slug: string;
  excerpt: string;
  categorySlug: string;
  featured?: boolean;
  body: string;
  tags: string[];
  faq: GaFaqItem[];
}[] = [
  {
    title: "How to Find the Revenue Your Website Is Leaving Behind",
    slug: "find-revenue-website-leaving-behind",
    excerpt:
      "A practical introduction to Money Gaps — visibility, conversion, and trust leaks that quietly cap growth.",
    categorySlug: "guides",
    featured: true,
    tags: ["money-gaps", "growth"],
    faq: [
      {
        question: "What is a Money Gap?",
        answer:
          "A Money Gap is a concrete miss on your site — visibility, conversion, or trust — that leaves revenue on the table. MoneyGap AI surfaces them with an AI Estimate of impact (not a guarantee) and a Fix Path™ you can implement with human review.",
      },
      {
        question: "Where should teams start?",
        answer:
          "Start with one high-impact Quick Win: usually a missing meta description, weak CTA hierarchy, or a trust gap on a money page. Ship it, measure, then compound.",
      },
    ],
    body: `## Why revenue leaks hide in plain sight

Most teams track traffic. Fewer connect gaps in SEO, offers, and trust to dollars left on the table. A page can rank, look “fine,” and still fail to earn clicks, trust, or conversions — and the dashboards rarely say why.

> Traffic without conversion clarity is a vanity metric wearing a growth costume.

Money Gaps are those silent leaks: missing intent coverage, soft CTAs, thin proof, unclear policies, or metadata that never earned the click.

## The three leak surfaces

### Visibility

Buyers never see you for the queries that matter — or they see a weak snippet and skip you. Titles, meta descriptions, topical depth, and AI-citation readiness all sit here.

### Conversion

They arrive, hesitate, and leave. CTA hierarchy, offer clarity, page speed perception, and form friction decide whether interest becomes a lead.

### Trust

Proof, policies, security cues, and consistent voice reduce the last mile of doubt. When trust is thin, even good traffic stalls.

## The MoneyGap loop

1. **Discover** what’s missing on live pages
2. **Explain** business impact with an AI Estimate — labeled honestly, never a guarantee
3. **Build** a Fix Path™ with ordered steps
4. **Implement** with human review before anything ships
5. **Measure** and compound the next win

This loop is how Growth Academy™ content and the product stay aligned: learn the pattern, then run it on your site.

## What “good” looks like in week one

- One Money Gap opened and understood end-to-end
- One Fix Path™ step shipped (metadata, CTA, or trust cue)
- One before/after note so the team sees the habit forming

## What to do next

Run an analysis, open your top opportunity, and ship one Quick Win this week.

[Analyze a website](/sign-up) — or keep reading in Growth Academy™ for SEO, conversion, and trust playbooks.
`,
  },
  {
    title: "Buyer-Intent Content That Supports GEO and AI Citations",
    slug: "buyer-intent-content-geo-ai-citations",
    excerpt:
      "Thin topical coverage loses decision-stage traffic. Here’s a draft editorial approach for long-tail intent.",
    categorySlug: "seo",
    featured: true,
    tags: ["seo", "buyer-intent", "geo"],
    faq: [
      {
        question: "What is GEO in this context?",
        answer:
          "Generative Engine Optimization — structuring content so AI systems can cite accurate, decision-useful answers. Depth, FAQs, comparisons, and clear entities help more than thin blog posts.",
      },
      {
        question: "Can AI drafts publish automatically?",
        answer:
          "No. MoneyGap AI and Growth Academy™ treat AI as a draft assistant. Human review is required before publish, and impact figures stay labeled as AI Estimates.",
      },
    ],
    body: `## The gap

Buyer-intent queries need depth — comparisons, FAQs, objections, and proof — not thin posts that restate the keyword. Decision-stage buyers ask specific questions; generic intros lose them (and lose AI systems looking for citable answers).

> If a page can’t answer the buying question in the first screen, it won’t earn the citation or the click.

## What decision-stage coverage includes

- **Comparisons** that name real alternatives and tradeoffs
- **FAQ blocks** that mirror how buyers ask in search and chat
- **Proof** with honest labels (case context, constraints, AI Estimates where used)
- **Internal links** from education into pricing, product, and signup paths

## A 90-day outline (draft plan)

### Weeks 1–4 — Foundation

Build a keyword shortlist weighted to commercial and comparison intent. Ship three decision-stage drafts with human review. Map each piece to one primary CTA.

### Weeks 5–8 — Depth

Add comparison and FAQ pages. Strengthen entity clarity (product, category, audience). Refresh thin posts that already rank but don’t convert.

### Weeks 9–12 — Compounding

Tighten internal linking from guides into money pages. Re-scan for Money Gaps on those URLs. Measure snippet CTR and assisted conversions — not vanity rankings alone.

## Editorial rule

All AI-assisted drafts require human review before publish. Label impact figures as **AI Estimate**. Prefer one excellent decision page over five thin posts.

## How MoneyGap AI helps

Use analysis to find missing buyer-intent coverage and weak metadata, then draft Fix Paths™ for pages that already attract (or should attract) commercial traffic. Growth Academy™ stays the education layer; the product closes the loop on your live site.
`,
  },
  {
    title: "Meta Descriptions That Improve CTR Without Hype",
    slug: "meta-descriptions-improve-ctr",
    excerpt:
      "Missing or vague meta descriptions soften click-through. Use this checklist before you ship pages.",
    categorySlug: "technical-seo",
    tags: ["seo", "metadata"],
    faq: [
      {
        question: "How long should a meta description be?",
        answer:
          "Aim for roughly 150–160 characters so the primary promise fits a typical SERP snippet. Lead with intent and outcome; avoid stuffing or hype that doesn’t match the page.",
      },
      {
        question: "Does MoneyGap auto-publish metadata?",
        answer:
          "No. The Metadata Engine™ proposes drafts for human confirmation. Nothing ships without review.",
      },
    ],
    body: `## What’s missing

Pages without clear meta descriptions force search engines — and buyers — to guess. Autogenerated snippets often pull a random sentence, bury the offer, or sound like every competitor in the SERP.

> The meta description is not copy decoration. It’s your pitch for the click.

When descriptions are missing, vague, or mismatched to the H1, click-through softens even if rankings hold. That is a visibility Money Gap: you earned the impression and still lost the visit.

## What strong descriptions do

- Match **search intent** (learn vs compare vs buy)
- Promise a specific outcome the page actually delivers
- Align language with the title and H1 — no bait-and-switch
- Stay scannable at ~150–160 characters
- Avoid empty hype (“best ever,” “#1,” “revolutionary”) without proof

## Fix Path™ checklist

1. Audit money pages for missing or duplicate descriptions
2. Rewrite intent-matched copy (150–160 chars)
3. Preview the SERP snippet next to title and URL
4. Align title, H1, and primary CTA language
5. Publish with human confirmation
6. Re-scan after ship and note CTR movement over a meaningful window

## A simple rewrite pattern

**Before:** “Learn more about our SEO tools and features for growing businesses.”

**After:** “Find Money Gaps on your site — missing metadata, weak CTAs, trust leaks — then ship a Fix Path™ with human review.”

The second version names the job-to-be-done and the next step without overclaiming results.

## Metadata Engine™ (human in the loop)

MoneyGap’s Metadata Engine™ proposes drafts from page context for human confirmation — never auto-publish. Treat every suggestion as a starting point: tighten intent, cut fluff, confirm the page delivers.

## What to do next

Open your highest-traffic money page. If the meta description could belong to any competitor, rewrite it this week — then re-scan.
`,
  },
  {
    title: "Trust Signals Buyers Expect Before They Convert",
    slug: "trust-signals-before-convert",
    excerpt:
      "Proof, policy, and clarity reduce friction between interest and signup.",
    categorySlug: "conversion-optimization",
    tags: ["trust", "conversion"],
    faq: [
      {
        question: "Which trust signals matter most?",
        answer:
          "Clear pricing and policies, honest outcomes, support and security clarity, and a consistent brand voice. Prioritize the gaps on pages closest to conversion.",
      },
      {
        question: "How do trust signals relate to Money Gaps?",
        answer:
          "Missing trust cues are conversion and trust Money Gaps. MoneyGap AI can surface them alongside visibility issues so you fix the full path from click to signup.",
      },
    ],
    body: `## Why trust compounds conversion

When proof is missing, traffic stalls at hesitation. Buyers rarely announce doubt — they leave. Trust signals don’t replace a strong offer; they remove the friction that keeps a good offer from closing.

> Conversion is often a trust problem wearing a design costume.

## Signals that matter

### Clarity

- Transparent pricing (or a clear path to it)
- Policies buyers can find without hunting
- What happens after signup — timeline, access, support

### Proof

- Real outcomes with context and honest labels
- AI Estimates called out as estimates — never guarantees
- Specificity over vague “trusted by thousands” claims

### Safety and support

- Security and privacy cues where data is collected
- Visible support paths (docs, contact, response expectations)
- Consistent brand voice across product, marketing, and help

## Where teams usually underinvest

Homepage polish gets budget; checkout-adjacent pages get leftovers. Prioritize trust on:

1. Pricing and plan comparison
2. Signup and onboarding first screens
3. High-intent SEO pages that already earn traffic
4. Footer and policy discoverability on money URLs

## A practical trust pass

- List every claim on a money page — can you back it?
- Remove or rewrite anything that overpromises
- Add one concrete proof or policy link above the fold on the primary CTA screen
- Align tone so marketing and product feel like the same company

## Pair with Money Gaps

Pair trust work with Money Gaps on your live site for prioritized Fix Paths™. Visibility wins that dump users onto low-trust pages often look like “SEO didn’t work” when the real miss was hesitation at the last step.

[Analyze your site](/sign-up) to see which trust and conversion gaps sit on your highest-value URLs.
`,
  },
  {
    title:
      "Post-Mortem: Broken Mobile Guest Checkout Routing Cost ~$18k/Month",
    slug: "mobile-guest-checkout-routing-18k",
    excerpt:
      "How a desktop-only guest checkout path looked like a traffic problem — and a reconstructed Estimated Opportunity of about $18k monthly.",
    categorySlug: "conversion-optimization",
    featured: true,
    tags: ["post-mortem", "mobile", "checkout", "conversion"],
    faq: [
      {
        question: "Is the $18k figure a guaranteed revenue loss?",
        answer:
          "No. It is a reconstructed Estimated Opportunity from session, funnel, and average-order assumptions in a composite scenario — a decision aid, not audited finance or a guarantee of results.",
      },
      {
        question: "What was the root cause?",
        answer:
          "Guest checkout deep-links resolved correctly on desktop but hit a mobile routing/redirect mismatch (viewport and auth-gate path divergence), so shoppers landed on a dead or login-forced step instead of guest checkout.",
      },
      {
        question: "How do Money Gaps™ help catch this class of issue?",
        answer:
          "Conversion Money Gaps™ surface friction on money paths. Pair a full scan and Fix Path™ with device-specific QA of guest vs authenticated flows — then re-scan after the routing fix ships.",
      },
    ],
    body: `## Disclaimer

This post-mortem is a **composite / illustrative engineering narrative**. Figures are a reconstructed **Estimated Opportunity** (AI Estimate-style decision aid), not a named customer claim and not audited financial results. Use it as a pattern guide — always validate against your own analytics.

## Incident summary

A mid-market commerce site saw mobile “add to cart → pay” completions collapse while desktop held steady. Paid traffic and product pages looked healthy. Leadership blamed “mobile traffic quality.”

Reconstructed funnel math (sessions × guest-checkout attempt rate × completion drop × AOV) pointed to roughly **~$18k/month** left on the table while the broken path stayed live — an Estimated Opportunity, not a guarantee of recovery.

> Desktop worked. Mobile looked like churn. The bug was routing.

## Timeline

1. **Detect** — Mobile conversion rate for guest checkout fell sharply week-over-week; desktop unchanged. Support tickets mentioned “keeps asking me to log in on my phone.”
2. **Triage** — Analytics showed carts created, then exits on a transitional URL that only mobile hit.
3. **Root cause** — Guest checkout deep-link / redirect chain branched by user-agent and viewport. Desktop resolved to \`/checkout/guest\`. Mobile hit an auth middleware path that assumed account sessions, then bounced to login with a broken \`returnUrl\` encoding.
4. **Fix** — Unify guest routing: same destination for guest intent regardless of device; preserve \`returnUrl\`; add an explicit “Continue as guest” control above the fold on mobile.
5. **Verify** — Device matrix QA (iOS Safari, Chrome Android) + funnel monitor for 14 days; mobile guest completion recovered toward the prior baseline.

## Engineering breakdown

### Path divergence

| Step | Desktop | Mobile (broken) |
| --- | --- | --- |
| Cart CTA | \`/checkout/guest\` | Soft-nav to \`/checkout\` then client redirect |
| Auth gate | Skipped for \`guest=1\` | Middleware treated missing session as force-login |
| Return URL | Intact | Truncated / double-encoded → login loop |

The desktop path never exercised the soft-nav + middleware combo. Mobile webviews and in-app browsers made the failure louder.

### Why it looked like a “traffic” problem

- Session counts still rose (ads worked).
- Product engagement looked fine.
- Only the **last mile** — guest pay — failed, and only on mobile.
- Aggregate conversion charts diluted the signal until the funnel was sliced by device + checkout mode.

## What to watch for on your site

- Separate guest vs authenticated checkout URLs that diverge by breakpoint or user-agent
- Auth middleware that runs before “guest allowed” flags are parsed
- \`returnUrl\` / deep-link encoding differences between soft navigation and full page loads
- CTAs that open login-first sheets on mobile while desktop keeps guest inline

## Money Gaps™ and Fix Path™ takeaway

This class of leak is a **conversion Money Gap™**: the offer and traffic were fine; the path to pay was not. A codebase growth audit mindset — treat routing and middleware as revenue surface area — beats another homepage redesign.

Practical loop:

1. Run a free live diagnostic ([homepage sandbox](/) or \`npx moneygap-scan\`) for crawl/schema/perf signals
2. Start free and run a full MoneyGap Engine™ scan on money URLs
3. Open the top conversion Fix Path™ and add **device-specific guest checkout QA** as an explicit step
4. Ship the routing fix with human review, then re-scan

## What to do next

If mobile conversions slipped while desktop held, inspect guest checkout routing before you cut ad spend. Read more conversion playbooks in [Growth Academy™](/academy), or [analyze your site](/sign-up) to prioritize Fix Paths™.
`,
  },
];

export async function seedGrowthAcademyContent() {
  await ensureGrowthAcademyCatalog();
  const author = await ensureDefaultAuthor();

  let inserted = 0;
  let updated = 0;

  for (const sample of SAMPLES) {
    const readingTimeMinutes = estimateReadingTimeMinutes(sample.body);
    const category = await db.query.gaCategories.findFirst({
      where: eq(gaCategories.slug, sample.categorySlug),
    });

    const existing = await db.query.gaArticles.findFirst({
      where: eq(gaArticles.slug, sample.slug),
    });

    if (existing) {
      await db
        .update(gaArticles)
        .set({
          title: sample.title,
          excerpt: sample.excerpt,
          bodyMarkdown: sample.body,
          seoTitle: sample.title,
          seoDescription: sample.excerpt,
          featured: Boolean(sample.featured),
          readingTimeMinutes,
          faqJson: sample.faq,
          updatedAt: new Date(),
        })
        .where(eq(gaArticles.id, existing.id));
      updated += 1;
      continue;
    }

    const [article] = await db
      .insert(gaArticles)
      .values({
        title: sample.title,
        slug: sample.slug,
        excerpt: sample.excerpt,
        bodyMarkdown: sample.body,
        status: "published",
        publishedAt: new Date(),
        authorId: author.id,
        seoTitle: sample.title,
        seoDescription: sample.excerpt,
        featured: Boolean(sample.featured),
        readingTimeMinutes,
        faqJson: sample.faq,
      })
      .returning();

    if (category) {
      await db.insert(gaArticleCategories).values({
        articleId: article.id,
        categoryId: category.id,
      });
    }
    inserted += 1;
  }

  return { ok: true as const, seeded: SAMPLES.length, inserted, updated };
}
