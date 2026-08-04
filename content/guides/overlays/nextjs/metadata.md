---
title: "Metadata in Next.js"
description: "App Router generateMetadata, canonicals, and OG tags so crawlers never depend on client hydration for head tags."
difficulty: beginner
tags:
  - title
  - description
  - generateMetadata
  - open-graph
cliCommands:
  - "moneygap scan"
  - "npx moneygap-scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

**Next.js App Router** owns document metadata through the `metadata` export and `generateMetadata`. These run on the server and serialize into the initial HTML `<head>`. Client-only `document.title` updates are invisible to many crawlers and create a false sense of SEO readiness after hydration.

Pages Router apps should use `next/head` consistently on the server render path — never only inside `useEffect`.

## Step-by-Step Solution

1. Set a root `metadata` / `title.template` in `app/layout.tsx`.
2. Override per route with unique `title` and `description` (static export or `generateMetadata`).
3. Add `alternates.canonical` for the preferred URL (match `www` vs apex).
4. Map Open Graph / Twitter fields (`openGraph`, `twitter`) to the same title/description intent.
5. Mark preview/staging with `robots: { index: false }` so soft environments do not compete.
6. View Source on production — confirm tags exist before any JS runs.
7. Validate with `npx moneygap-scan <url>` and Search Console URL inspection.

## Code Examples

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.example.com"),
  title: {
    default: "Acme Analytics",
    template: "%s — Acme Analytics",
  },
  description: "Close growth gaps with clearer Fix Paths.",
};

// app/pricing/page.tsx
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Pricing",
    description:
      "Simple plans for teams closing growth gaps. Start Free Trial — AI Estimates only, not guaranteed ROI.",
    alternates: { canonical: "/pricing" },
    openGraph: {
      title: "Pricing — Acme Analytics",
      description: "Simple plans for teams closing growth gaps.",
      url: "/pricing",
      type: "website",
    },
  };
}
```

Dynamic segments:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  return {
    title: page.title,
    description: page.excerpt,
    alternates: { canonical: `/blog/${slug}` },
  };
}
```

## Deployment Checklist

- [ ] Every indexable route has unique title + description in View Source
- [ ] `metadataBase` set so OG images resolve to absolute URLs
- [ ] Canonical host matches redirects (`www` vs apex)
- [ ] Preview deployments are `noindex`
- [ ] `moneygap-scan` shows no missing-title findings on money pages

## Browser Extension Tips

Open a key landing page and confirm the shared extension report lists metadata opportunities — then re-scan after shipping `generateMetadata` fixes.
