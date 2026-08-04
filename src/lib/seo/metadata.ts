import type { Metadata } from "next";
import { absoluteUrl, getSiteOrigin } from "./site";

export type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  images?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const images = (input.images ?? [])
    .filter(Boolean)
    .map((src) => (src.startsWith("http") ? src : absoluteUrl(src)));

  return {
    title: input.title,
    description: input.description,
    metadataBase: new URL(getSiteOrigin()),
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: input.type ?? "website",
      siteName: "MoneyGap AI",
      images: images.length ? images.map((url) => ({ url })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: images.length ? images : undefined,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export const SITE_DEFAULT_TITLE =
  "MoneyGap AI — Find the revenue you're leaving behind";
export const SITE_DEFAULT_DESCRIPTION =
  "MoneyGap AI is a developer-friendly conversion tool and codebase growth audit — find where your site leaks revenue, then close gaps with Fix Paths™ and a free CLI sandbox.";
