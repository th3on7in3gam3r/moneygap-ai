---
title: "Hydration Failures in Next.js"
description: "Fix React hydration mismatches in the Next.js App Router that break interactivity and SEO trust."
difficulty: intermediate
tags:
  - hydration
  - ssr
  - nextjs
cliCommands:
  - "moneygap scan"
  - "npx moneygap-scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

In **Next.js (App Router)**, Server Components render HTML on the server; Client Components (`"use client"`) hydrate on the browser. Mismatches usually come from Client Components that render different trees on server vs client, or from invalid nesting inside the shared document shell.

Prefer keeping marketing heroes and primary CTAs in Server Components. Push interactivity (modals, charts) into small Client islands with identical initial markup.

## Step-by-Step Solution

1. Reproduce with `next dev` and watch the console for “Text content did not match” / hydration errors.
2. Isolate the Client Component that owns the mismatch; temporarily simplify its first render to static text.
3. Move time/locale/random values into `useEffect` (post-hydrate) or pass them as props from a stable server source.
4. Validate HTML: no `<p>` wrapping block elements; use the Next.js docs invalid HTML guide.
5. Re-test production build (`next build && next start`) — some mismatches only appear outside Strict Mode quirks.
6. Re-scan with `npx moneygap-scan <url>` and confirm CTAs still work.

## Code Examples

```tsx
// Bad: different server vs client first paint
"use client";
export function Greeting() {
  return <p>Today is {new Date().toLocaleDateString()}</p>;
}

// Better: stable first paint, then enhance
"use client";
import { useEffect, useState } from "react";

export function Greeting() {
  const [label, setLabel] = useState("Today");
  useEffect(() => {
    setLabel(`Today is ${new Date().toLocaleDateString()}`);
  }, []);
  return <p>{label}</p>;
}
```

For App Router metadata, keep titles in `generateMetadata` / `metadata` exports — never set `document.title` only on the client for SEO-critical pages.

## Deployment Checklist

- [ ] Zero hydration warnings on `/`, pricing, and signup routes in production
- [ ] Primary CTA (“Start Free Trial”) clickable without a full client remount
- [ ] Preview deployments checked with View Source + console
- [ ] `moneygap-scan` run against the preview URL before merge

## Browser Extension Tips

After deploy, open the live URL in the MoneyGap extension and confirm no conversion/interactivity findings that look like “dead” CTAs caused by hydrate failures.
