import { faqPageJsonLd, jsonLdScript } from "@/lib/seo";

export type FaqItem = { question: string; answer: string };

export function FaqBlock({
  items,
  title = "Frequently asked questions",
}: {
  items: FaqItem[];
  title?: string;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(items)) }}
      />
      <div className="max-w-3xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
        <dl className="mt-8 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <div key={item.question} className="py-5">
              <dt className="font-medium text-fg">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
