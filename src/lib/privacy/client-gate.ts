"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConsentCategories, ConsentCategoryId } from "@/lib/privacy/categories";
import { rejectOptionalCategories } from "@/lib/privacy/categories";
import { CONSENT_SCHEMA_VERSION } from "@/lib/privacy/versions";

const LS_KEY = "mg_consent_client";

type Stored = {
  v: string;
  c: ConsentCategories;
};

function readLocal(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

function writeLocal(categories: ConsentCategories) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ v: CONSENT_SCHEMA_VERSION, c: categories }),
    );
  } catch {
    /* ignore */
  }
}

export function hasConsent(category: ConsentCategoryId): boolean {
  if (category === "essential") return true;
  const stored = readLocal();
  if (!stored || stored.v !== CONSENT_SCHEMA_VERSION) return false;
  return Boolean(stored.c[category]);
}

export function useConsentGate() {
  const [categories, setCategories] = useState<ConsentCategories>(
    rejectOptionalCategories(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readLocal();
    if (local?.v === CONSENT_SCHEMA_VERSION) {
      setCategories(local.c);
    }
    setReady(true);
  }, []);

  const allows = useCallback(
    (category: ConsentCategoryId) => {
      if (category === "essential") return true;
      return Boolean(categories[category]);
    },
    [categories],
  );

  const persistClient = useCallback((next: ConsentCategories) => {
    writeLocal(next);
    setCategories(next);
  }, []);

  return { categories, ready, allows, persistClient };
}

export { writeLocal as persistConsentClient, readLocal as readConsentClient };
