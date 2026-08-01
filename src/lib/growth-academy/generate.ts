import OpenAI from "openai";
import type { GaAiAssist, GaFaqItem } from "@/db/schema";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";
import { buildInternalLinkSuggestions } from "./linking";

export type GeneratedArticlePack = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  bodyMarkdown: string;
  faqJson: GaFaqItem[];
  aiAssist: GaAiAssist;
  suggestedTags: string[];
};

const packSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "excerpt",
    "seoTitle",
    "seoDescription",
    "bodyMarkdown",
    "faq",
    "socialPosts",
    "newsletterCopy",
    "imagePrompts",
    "ctas",
    "externalCitations",
    "schemaNotes",
    "suggestedTags",
  ],
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    bodyMarkdown: { type: "string" },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
    },
    socialPosts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["channel", "copy"],
        properties: {
          channel: { type: "string" },
          copy: { type: "string" },
        },
      },
    },
    newsletterCopy: { type: "string" },
    imagePrompts: { type: "array", items: { type: "string" } },
    ctas: { type: "array", items: { type: "string" } },
    externalCitations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "label"],
        properties: {
          url: { type: "string" },
          label: { type: "string" },
        },
      },
    },
    schemaNotes: { type: "string" },
    suggestedTags: { type: "array", items: { type: "string" } },
  },
} as const;

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) return part.text;
      }
    }
  }
  throw new Error("Article generation failed. Please try again.");
}

export async function generateArticleDraft(input: {
  topic: string;
  angle?: string;
  categoryHint?: string;
}): Promise<GeneratedArticlePack> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const links = await buildInternalLinkSuggestions(null);

  const response = await client.responses.create({
    model,
    instructions: `You are the Growth Academy™ AI Publishing Engine for MoneyGap AI.
Produce editorial drafts for human review — never claim content is published.
Label any revenue/traffic projections as AI Estimate (not a guarantee).
Write in a premium SaaS educator voice. Use markdown with ## / ### headings.
Include a short FAQ (3–5 items), CTAs pointing readers to analyze their site,
and practical Fix Path™ style steps where relevant.
Suggested internal links (editor may insert): ${JSON.stringify(links.slice(0, 8))}`,
    input: `Topic: ${input.topic}
Angle: ${input.angle ?? "practical growth education"}
Category hint: ${input.categoryHint ?? "articles"}

Return a complete draft pack as JSON.`,
    text: {
      format: {
        type: "json_schema",
        name: "ga_article_pack",
        strict: true,
        schema: packSchema,
      },
    },
  });

  const parsed = JSON.parse(extractOutputText(response)) as {
    title: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    bodyMarkdown: string;
    faq: GaFaqItem[];
    socialPosts: { channel: string; copy: string }[];
    newsletterCopy: string;
    imagePrompts: string[];
    ctas: string[];
    externalCitations: { url: string; label: string }[];
    schemaNotes: string;
    suggestedTags: string[];
  };

  return {
    title: parsed.title,
    excerpt: parsed.excerpt,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    bodyMarkdown: `${parsed.bodyMarkdown.trim()}\n\n---\n\n*Draft for human review — not auto-published.*\n`,
    faqJson: parsed.faq ?? [],
    aiAssist: {
      internalLinks: links,
      externalCitations: parsed.externalCitations ?? [],
      socialPosts: parsed.socialPosts ?? [],
      newsletterCopy: parsed.newsletterCopy,
      imagePrompts: parsed.imagePrompts ?? [],
      ctas: parsed.ctas ?? [],
      schemaNotes: parsed.schemaNotes,
    },
    suggestedTags: parsed.suggestedTags ?? [],
  };
}
