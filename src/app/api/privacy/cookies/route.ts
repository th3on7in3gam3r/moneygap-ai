import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import {
  CONSENT_COOKIE_NAME,
  COOKIE_CATALOG,
  buildCookieInventory,
} from "@/lib/privacy";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await auth();
  const jar = await cookies();
  const observed: string[] = [];
  for (const c of jar.getAll()) {
    observed.push(c.name);
  }
  // Always include catalog names that may be HttpOnly so status reflects presence
  if (jar.get(CONSENT_COOKIE_NAME)) observed.push(CONSENT_COOKIE_NAME);

  const url = new URL(req.url);
  const clientCookies = url.searchParams.get("client")?.split(",").filter(Boolean) ?? [];
  const storageKeys =
    url.searchParams.get("storage")?.split(",").filter(Boolean) ?? [];

  const inventory = buildCookieInventory({
    observedCookieNames: [...observed, ...clientCookies],
    observedStorageKeys: storageKeys,
  });

  return Response.json({
    inventory,
    catalogCount: COOKIE_CATALOG.length,
    note: "Only verified first-party cookies and storage keys are listed. Optional analytics cookies are not invented.",
  });
}
