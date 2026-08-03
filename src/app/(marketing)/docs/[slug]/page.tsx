import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-article";
import {
  getPublicDocNeighbors,
  listPublicDocs,
  loadPublicDoc,
} from "@/lib/docs";
import { breadcrumbJsonLd, buildPageMetadata, jsonLdScript } from "@/lib/seo";

export function generateStaticParams() {
  return listPublicDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await loadPublicDoc(slug);
  if (!doc) return { title: "Documentation" };
  return buildPageMetadata({
    title: doc.title,
    description: doc.description,
    path: `/docs/${slug}`,
  });
}

export default async function PublicDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await loadPublicDoc(slug);
  if (!doc) notFound();

  const { prev, next } = getPublicDocNeighbors(slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Docs", path: "/docs" },
              { name: doc.title, path: `/docs/${slug}` },
            ]),
          ),
        }}
      />
      <DocsArticle
        title={doc.title}
        category={doc.entry.category}
        summary={doc.entry.summary}
        html={doc.html}
        toc={doc.toc}
        prev={prev}
        next={next}
      />
    </>
  );
}
