import type {
  CustomerQuestion,
  SearchIntentKind,
} from "@/lib/opportunity-intelligence/types";

function q(
  id: string,
  question: string,
  intent: SearchIntentKind,
  relatedService?: string | null,
  suggestFaq = true,
  suggestGuide = false,
): CustomerQuestion {
  return { id, question, intent, relatedService, suggestFaq, suggestGuide };
}

export function discoverCustomerQuestions(input: {
  services: string[];
  products: string[];
  problems: string[];
  audience?: string;
}): CustomerQuestion[] {
  const out: CustomerQuestion[] = [
    q("q-include", "What does this service include?", "commercial"),
    q("q-cost", "How much does it cost?", "transactional"),
    q("q-for", "Who is this for?", "informational", null, true, false),
    q("q-alt", "What are the alternatives?", "comparison", null, true, true),
    q(
      "q-time",
      "How long does implementation take?",
      "problem_solving",
      null,
      true,
      true,
    ),
    q(
      "q-industries",
      "What industries benefit most?",
      "informational",
      null,
      true,
      true,
    ),
  ];

  for (const [i, service] of input.services.slice(0, 5).entries()) {
    out.push(
      q(
        `q-svc-${i}`,
        `What results can I expect from ${service}?`,
        "commercial",
        service,
        true,
        true,
      ),
      q(
        `q-svc-how-${i}`,
        `How does ${service} work?`,
        "educational",
        service,
        true,
        true,
      ),
    );
  }

  for (const [i, problem] of input.problems.slice(0, 4).entries()) {
    out.push(
      q(
        `q-prob-${i}`,
        `How do you solve ${problem}?`,
        "problem_solving",
        null,
        true,
        true,
      ),
    );
  }

  if (input.audience) {
    out.push(
      q(
        "q-aud",
        `Is this right for ${input.audience}?`,
        "commercial",
        null,
        true,
        false,
      ),
    );
  }

  return out;
}
