import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Compare URLs — MoneyGap Labs",
  description:
    "Side-by-side free sandbox diagnostics for two public URLs. Publish opt-in Open Audits. AI Estimate framing only.",
  path: "/labs/compare",
});

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
