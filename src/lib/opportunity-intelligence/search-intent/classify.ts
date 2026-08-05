import type { SearchIntentKind } from "@/lib/opportunity-intelligence/types";

export function classifySearchIntent(term: string): SearchIntentKind {
  const t = term.toLowerCase();
  if (
    t.includes("near me") ||
    t.includes(" in ") ||
    /\b(nyc|la|london|toronto|chicago|miami|dallas|austin)\b/.test(t)
  ) {
    return "local";
  }
  if (
    t.includes("buy") ||
    t.includes("pricing") ||
    t.includes("price") ||
    t.includes("cost") ||
    t.includes("order") ||
    t.includes("sign up") ||
    t.includes("subscribe")
  ) {
    return "transactional";
  }
  if (
    t.includes("best") ||
    t.includes("review") ||
    t.includes("compare") ||
    t.includes(" vs ") ||
    t.includes("alternative") ||
    t.includes("top ")
  ) {
    return t.includes(" vs ") || t.includes("compare") || t.includes("alternative")
      ? "comparison"
      : "commercial";
  }
  if (
    t.includes("how to") ||
    t.includes("fix") ||
    t.includes("troubleshoot") ||
    t.includes("error") ||
    t.includes("issue")
  ) {
    return "problem_solving";
  }
  if (
    t.includes("chatgpt") ||
    t.includes("ai ") ||
    t.includes("llm") ||
    t.includes("assistant") ||
    t.startsWith("explain ")
  ) {
    return "ai_assistant";
  }
  if (
    t.includes("guide") ||
    t.includes("tutorial") ||
    t.includes("learn") ||
    t.includes("course") ||
    t.includes("what is")
  ) {
    return "educational";
  }
  if (t.includes("login") || t.includes("official") || t.includes("website")) {
    return "navigational";
  }
  if (t.startsWith("what ") || t.startsWith("why ") || t.startsWith("who ")) {
    return "informational";
  }
  return "informational";
}
