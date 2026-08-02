import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import {
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  CONSENT_SCHEMA_VERSION,
  PRIVACY_POLICY_VERSION,
  acceptAllCategories,
  consentNeedsPrompt,
  getLatestConsent,
  normalizeCategories,
  rejectOptionalCategories,
  saveConsent,
  type ConsentCategories,
} from "@/lib/privacy";

export const runtime = "nodejs";

type Body = {
  action?: "accept_all" | "reject_optional" | "customize" | "withdraw";
  categories?: Partial<ConsentCategories>;
  visitorKey?: string;
  regionHint?: string;
  source?: "smart_consent" | "privacy_center" | "withdraw";
};

function encodeConsentCookie(categories: ConsentCategories) {
  return Buffer.from(
    JSON.stringify({
      v: CONSENT_SCHEMA_VERSION,
      p: PRIVACY_POLICY_VERSION,
      c: categories,
      t: Date.now(),
    }),
    "utf8",
  ).toString("base64url");
}

export async function GET() {
  const { userId } = await auth();
  const jar = await cookies();
  const raw = jar.get(CONSENT_COOKIE_NAME)?.value ?? null;
  let cookieVersion: string | null = null;
  let cookieCategories: ConsentCategories | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, "base64url").toString("utf8"),
      ) as { v?: string; c?: ConsentCategories };
      cookieVersion = parsed.v ?? null;
      cookieCategories = parsed.c ? normalizeCategories(parsed.c) : null;
    } catch {
      /* ignore */
    }
  }

  let record = null;
  let needsPrompt = true;
  try {
    record = await getLatestConsent({ userId: userId ?? null });
    needsPrompt = await consentNeedsPrompt({
      userId: userId ?? null,
      cookieVersion,
    });
  } catch {
    needsPrompt = !(
      cookieVersion && cookieVersion === CONSENT_SCHEMA_VERSION
    );
  }

  return Response.json({
    needsPrompt,
    consentVersion: CONSENT_SCHEMA_VERSION,
    policyVersion: PRIVACY_POLICY_VERSION,
    categories:
      record?.categories ??
      cookieCategories ??
      rejectOptionalCategories(),
    source: record?.source ?? null,
    updatedAt: record?.updatedAt ?? null,
  });
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const { userId } = await auth();
  const action = body.action ?? "customize";
  let categories: ConsentCategories;
  if (action === "accept_all") categories = acceptAllCategories();
  else if (action === "reject_optional" || action === "withdraw")
    categories = rejectOptionalCategories();
  else categories = normalizeCategories(body.categories);

  const source =
    action === "withdraw"
      ? "withdraw"
      : body.source === "privacy_center"
        ? "privacy_center"
        : "smart_consent";

  try {
    const saved = await saveConsent({
      userId: userId ?? null,
      workspaceId: null,
      categories,
      source,
      regionHint: body.regionHint ?? null,
      visitorKey: body.visitorKey ?? null,
    });

    const jar = await cookies();
    jar.set(CONSENT_COOKIE_NAME, encodeConsentCookie(saved.categories), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
    });

    return Response.json({
      ok: true,
      categories: saved.categories,
      consentVersion: saved.consentVersion,
      policyVersion: saved.policyVersion,
    });
  } catch (err) {
    // Anonymous visitors may still set cookie if DB write fails (e.g. no user)
    const jar = await cookies();
    jar.set(CONSENT_COOKIE_NAME, encodeConsentCookie(categories), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
    });
    return Response.json({
      ok: true,
      categories,
      consentVersion: CONSENT_SCHEMA_VERSION,
      policyVersion: PRIVACY_POLICY_VERSION,
      persisted: false,
      note:
        err instanceof Error
          ? "Preferences saved in browser cookie; account history unavailable."
          : "Preferences saved in browser cookie.",
    });
  }
}
