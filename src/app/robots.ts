import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/sign-in",
          "/sign-up",
          "/invite/",
          "/share/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: origin,
  };
}
