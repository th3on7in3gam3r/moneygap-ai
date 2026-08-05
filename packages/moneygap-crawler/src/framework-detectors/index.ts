import type { FrameworkId } from "../types/index.js";

export type FrameworkDetection = {
  framework: FrameworkId;
  needsJs: boolean;
  signals: string[];
};

export function detectFramework(html: string): FrameworkDetection {
  const signals: string[] = [];
  const lower = html.slice(0, 200_000).toLowerCase();

  let framework: FrameworkId = "unknown";
  let needsJs = false;

  if (
    lower.includes("__next_data__") ||
    lower.includes("/_next/static") ||
    lower.includes('id="__next"')
  ) {
    framework = "nextjs";
    signals.push("nextjs");
  } else if (lower.includes("__nuxt") || lower.includes("/_nuxt/")) {
    framework = "nuxt";
    signals.push("nuxt");
  } else if (lower.includes("data-astro-cid") || lower.includes("astro-island")) {
    framework = "astro";
    signals.push("astro");
  } else if (lower.includes("ng-version") || lower.includes("ng-app")) {
    framework = "angular";
    signals.push("angular");
    needsJs = true;
  } else if (lower.includes("data-sveltekit") || lower.includes("__sveltekit")) {
    framework = "sveltekit";
    signals.push("sveltekit");
  } else if (
    lower.includes('id="root"') &&
    (lower.includes("react") || lower.includes("data-reactroot"))
  ) {
    framework = "react";
    signals.push("react-spa");
    needsJs = true;
  } else if (lower.includes("data-v-") && lower.includes("vue")) {
    framework = "vue";
    signals.push("vue");
  }

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasEmptyRoot =
    /<div[^>]+id=["']?(?:root|app|__next)["']?[^>]*>\s*<\/div>/i.test(html) ||
    /<div[^>]+id=["']?(?:root|app|__next)["']?[^>]*>\s*<noscript>/i.test(html);

  if (hasEmptyRoot && bodyText.length < 400) {
    needsJs = true;
    signals.push("empty-root");
  }

  if (bodyText.length < 120 && /<script/i.test(html)) {
    needsJs = true;
    signals.push("thin-body");
  }

  // Next.js with __NEXT_DATA__ or SSR content is usually fine as static
  if (framework === "nextjs" && lower.includes("__next_data__") && bodyText.length > 400) {
    needsJs = false;
  }
  if (framework === "astro" && bodyText.length > 400) {
    needsJs = false;
  }

  return { framework, needsJs, signals };
}
