import type { ConsentCategoryId } from "./categories";
import { CONSENT_COOKIE_NAME } from "./versions";

export type CookieStorageKind = "cookie" | "localStorage";

export type CatalogEntryStatus =
  | "active"
  | "configured_not_present"
  | "not_currently_loaded";

export type CookieCatalogEntry = {
  name: string;
  purpose: string;
  category: ConsentCategoryId;
  expiration: string;
  secure: boolean | null;
  httpOnly: boolean | null;
  sameSite: "Strict" | "Lax" | "None" | null;
  encrypted: boolean | null;
  provider: string;
  kind: CookieStorageKind;
  /** If false, this entry is documented but no script sets it yet. */
  currentlyUsed: boolean;
};

/**
 * Verified first-party registry only.
 * Optional analytics/performance cookies are intentionally absent —
 * categories exist for future gates, not invented cookies.
 */
export const COOKIE_CATALOG: CookieCatalogEntry[] = [
  {
    name: "__session",
    purpose: "Clerk authentication session for signed-in users.",
    category: "essential",
    expiration: "Session / Clerk-managed",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    encrypted: true,
    provider: "Clerk",
    kind: "cookie",
    currentlyUsed: true,
  },
  {
    name: "__client_uat",
    purpose: "Clerk client user activity timestamp for session freshness.",
    category: "essential",
    expiration: "Clerk-managed",
    secure: true,
    httpOnly: false,
    sameSite: "Lax",
    encrypted: null,
    provider: "Clerk",
    kind: "cookie",
    currentlyUsed: true,
  },
  {
    name: "__clerk_db_jwt",
    purpose: "Clerk database JWT for frontend auth state (when present).",
    category: "essential",
    expiration: "Clerk-managed",
    secure: true,
    httpOnly: false,
    sameSite: "Lax",
    encrypted: true,
    provider: "Clerk",
    kind: "cookie",
    currentlyUsed: true,
  },
  {
    name: CONSENT_COOKIE_NAME,
    purpose: "Stores Smart Consent™ category preferences and schema version.",
    category: "essential",
    expiration: "1 year",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    encrypted: false,
    provider: "MoneyGap AI",
    kind: "cookie",
    currentlyUsed: true,
  },
  {
    name: "mg_demo_mode",
    purpose: "Marks demo workspace mode for onboarding previews.",
    category: "essential",
    expiration: "Session / short-lived",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    encrypted: false,
    provider: "MoneyGap AI",
    kind: "cookie",
    currentlyUsed: true,
  },
  {
    name: "theme",
    purpose: "next-themes preference (light / dark / system).",
    category: "personalization",
    expiration: "Persistent until cleared",
    secure: null,
    httpOnly: null,
    sameSite: null,
    encrypted: false,
    provider: "MoneyGap AI (next-themes)",
    kind: "localStorage",
    currentlyUsed: true,
  },
];

export type CookieInventoryRow = CookieCatalogEntry & {
  status: CatalogEntryStatus;
  observed: boolean;
};

export function buildCookieInventory(opts: {
  observedCookieNames: string[];
  observedStorageKeys?: string[];
}): CookieInventoryRow[] {
  const cookies = new Set(opts.observedCookieNames.map((n) => n.toLowerCase()));
  const storage = new Set(
    (opts.observedStorageKeys ?? []).map((n) => n.toLowerCase()),
  );

  return COOKIE_CATALOG.map((entry) => {
    const key = entry.name.toLowerCase();
    const observed =
      entry.kind === "cookie" ? cookies.has(key) : storage.has(key);

    let status: CatalogEntryStatus;
    if (!entry.currentlyUsed) {
      status = "not_currently_loaded";
    } else if (observed) {
      status = "active";
    } else {
      status = "configured_not_present";
    }

    return { ...entry, status, observed };
  });
}
