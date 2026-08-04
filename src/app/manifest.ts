import type { MetadataRoute } from "next";
import { SITE_DEFAULT_DESCRIPTION } from "@/lib/seo";

/**
 * Web App Manifest for installable PWA support.
 * Served at /manifest.webmanifest by Next.js — does not replace page metadata.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyGap AI",
    short_name: "MoneyGap",
    description: SITE_DEFAULT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f6f4",
    theme_color: "#0f7a56",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
