import { ImageResponse } from "next/og";
import { getArticleBySlug, isGrowthAcademyEnabled } from "@/lib/growth-academy";

export const alt = "Growth Academy™ article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ArticleOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let title = "Growth Academy™";
  let excerpt = "Playbooks for closing Money Gaps™";

  if (isGrowthAcademyEnabled()) {
    try {
      const article = await getArticleBySlug(slug);
      if (article) {
        title = article.seoTitle || article.title;
        excerpt =
          article.seoDescription ||
          article.excerpt ||
          "Growth Academy™ by MoneyGap AI";
      }
    } catch {
      /* fallback copy */
    }
  }

  const displayTitle =
    title.length > 90 ? `${title.slice(0, 87)}…` : title;
  const displayExcerpt =
    excerpt.length > 140 ? `${excerpt.slice(0, 137)}…` : excerpt;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0c1210 0%, #12201a 45%, #1a2e24 100%)",
          padding: "56px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6ee7b7",
          }}
        >
          Growth Academy™ · MoneyGap AI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#f4f7f5",
              maxWidth: 980,
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#a7b5ad",
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            {displayExcerpt}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
