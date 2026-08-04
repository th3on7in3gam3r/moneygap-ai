export type CuratedLabArticle = {
  slug: string;
  title: string;
  description: string;
  body: string;
};

export const CURATED_LAB_ARTICLES: CuratedLabArticle[] = [
  {
    slug: "nextjs-metadata-vs-client-title",
    title: "Next.js metadata vs client-only document.title",
    description:
      "Why App Router generateMetadata wins over hydration-time title swaps for crawlability and SERP quality.",
    body: `## The comparison

| Approach | Crawler sees title? | Hydration risk | Maintenance |
| --- | --- | --- | --- |
| \`generateMetadata\` / \`metadata\` export | Yes — in initial HTML | None for head tags | Per-route server functions |
| \`useEffect(() => { document.title = … })\` | Often no | Extra client work | Easy to drift from H1 |

## Takeaway

Treat missing server metadata as a Money Gap™ on money pages. Fix Paths™ start with View Source — not the post-hydrate DOM. Impact of CTR lifts should be labeled an **AI Estimate**, not guaranteed ROI.

## Try it

Run \`npx moneygap-scan https://yoursite.com\` or publish a snapshot to [Open Audits](/labs). Read the deep dive: [Next.js metadata guide](/guides/nextjs/metadata).
`,
  },
  {
    slug: "hydration-mismatch-vs-stable-ssr",
    title: "Hydration mismatch vs stable SSR first paint",
    description:
      "Side-by-side: nondeterministic client trees versus a stable server render that hydrates cleanly.",
    body: `## The comparison

| Pattern | First paint | Interactivity | SEO / AEO |
| --- | --- | --- | --- |
| \`Date.now()\` / \`window\` branches in render | Flicker / warning | Handlers may miss | Unstable text for crawlers |
| Stable SSR + \`useEffect\` enhance | Matches HTML | Reliable after hydrate | Consistent citations |

## Takeaway

Hydration failures are conversion leaks wearing a performance costume. Guides: [Next.js hydration](/guides/nextjs/hydration), [React hydration](/guides/react/hydration).

## Try it

Compare two public URLs on [/labs/compare](/labs/compare) or publish an Open Audit after a sandbox run.
`,
  },
];

export function getCuratedLabArticle(slug: string) {
  return CURATED_LAB_ARTICLES.find((a) => a.slug === slug) ?? null;
}
