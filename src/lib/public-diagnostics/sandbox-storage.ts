"use client";

import { SANDBOX_STORAGE_KEY } from "@/lib/public-diagnostics/constants";
import type { SandboxStoragePayload } from "@/lib/public-diagnostics/types";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readSandboxHandoff(): SandboxStoragePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SandboxStoragePayload;
    if (!parsed?.url || typeof parsed.score !== "number") return null;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(SANDBOX_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSandboxHandoff(): void {
  try {
    localStorage.removeItem(SANDBOX_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
