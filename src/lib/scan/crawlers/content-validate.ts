/**
 * Detect useless / challenge / error-page content that should not count
 * as high-quality successful crawl evidence.
 */

const BAD_PATTERNS: RegExp[] = [
  /cf-browser-verification/i,
  /cloudflare/i,
  /attention required/i,
  /just a moment/i,
  /enable javascript/i,
  /please enable cookies/i,
  /captcha/i,
  /access denied/i,
  /forbidden/i,
  /bot detection/i,
  /checking your browser/i,
  /verify you are human/i,
];

export type ContentValidation = {
  ok: boolean;
  reason?: string;
  usefulChars: number;
};

export function validatePageContent(input: {
  markdown?: string | null;
  html?: string | null;
  title?: string | null;
  statusCode?: number | null;
}): ContentValidation {
  const status = input.statusCode ?? 200;
  if (status === 404) {
    return { ok: false, reason: "http_404", usefulChars: 0 };
  }
  if (status >= 500) {
    return { ok: false, reason: "http_5xx", usefulChars: 0 };
  }
  if (status === 401 || status === 403) {
    return { ok: false, reason: status === 403 ? "http_403" : "auth_required", usefulChars: 0 };
  }

  const body = `${input.title ?? ""}\n${input.markdown ?? ""}\n${input.html ?? ""}`;
  const trimmed = (input.markdown ?? "").trim();
  const usefulChars = trimmed.length;

  for (const re of BAD_PATTERNS) {
    if (re.test(body) && usefulChars < 800) {
      return { ok: false, reason: "challenge_or_blocked", usefulChars };
    }
  }

  if (usefulChars < 40) {
    return { ok: false, reason: "empty_content", usefulChars };
  }

  // Thin SPA shell heuristic
  if (
    usefulChars < 120 &&
    /<div id=["']?(root|app|__next)["']?/i.test(input.html ?? "")
  ) {
    return { ok: false, reason: "empty_spa_shell", usefulChars };
  }

  return { ok: true, usefulChars };
}
