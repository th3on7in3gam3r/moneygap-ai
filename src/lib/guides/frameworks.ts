import type { FrameworkId, FrameworkMeta } from "./types";

export const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: "nextjs",
    slug: "nextjs",
    name: "Next.js",
    ecosystem: ["react", "node"],
    summary: "React framework with App Router, metadata APIs, and image optimization.",
  },
  {
    id: "react",
    slug: "react",
    name: "React",
    ecosystem: ["spa", "vite"],
    summary: "UI library — pair with Vite or a meta-framework for SEO and routing.",
  },
  {
    id: "astro",
    slug: "astro",
    name: "Astro",
    ecosystem: ["content", "islands"],
    summary: "Content-first framework with zero JS by default and strong image tooling.",
  },
  {
    id: "remix",
    slug: "remix",
    name: "Remix",
    ecosystem: ["react", "loaders"],
    summary: "React framework centered on nested routes, loaders, and progressive enhancement.",
  },
  {
    id: "nuxt",
    slug: "nuxt",
    name: "Nuxt",
    ecosystem: ["vue"],
    summary: "Vue meta-framework with file-based routing and SEO modules.",
  },
  {
    id: "vue",
    slug: "vue",
    name: "Vue",
    ecosystem: ["spa"],
    summary: "Progressive framework — use Nuxt or SSR plugins for crawlable HTML.",
  },
  {
    id: "angular",
    slug: "angular",
    name: "Angular",
    ecosystem: ["spa"],
    summary: "Full framework with Universal SSR options for SEO and performance.",
  },
  {
    id: "sveltekit",
    slug: "sveltekit",
    name: "SvelteKit",
    ecosystem: ["svelte"],
    summary: "Svelte meta-framework with adapters for SSR, SSG, and edge deploy.",
  },
  {
    id: "laravel",
    slug: "laravel",
    name: "Laravel",
    ecosystem: ["php"],
    summary: "PHP application framework — Blade/Inertia/Livewire for HTML delivery.",
  },
  {
    id: "rails",
    slug: "rails",
    name: "Ruby on Rails",
    ecosystem: ["ruby"],
    summary: "Convention-over-configuration web framework with strong HTML defaults.",
  },
  {
    id: "wordpress",
    slug: "wordpress",
    name: "WordPress",
    ecosystem: ["php", "cms"],
    summary: "CMS platform — themes and plugins control SEO, schema, and performance.",
  },
  {
    id: "shopify",
    slug: "shopify",
    name: "Shopify",
    ecosystem: ["ecommerce", "liquid"],
    summary: "Commerce platform — Liquid themes, Online Store 2.0, and app extensions.",
  },
];

export function getFramework(idOrSlug: string): FrameworkMeta | undefined {
  return FRAMEWORKS.find((f) => f.id === idOrSlug || f.slug === idOrSlug);
}

export function isFrameworkId(v: string): v is FrameworkId {
  return FRAMEWORKS.some((f) => f.id === v);
}
