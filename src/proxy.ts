import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isMaintenanceMode } from "@/lib/observability/logger";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/reports(.*)",
  "/api/analysis(.*)",
  "/api/private(.*)",
  "/api/integrations(.*)",
]);

const isPublicOAuthCallback = createRouteMatcher([
  "/api/integrations/oauth/(.*)/callback",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isMaintenanceMode()) {
    const path = req.nextUrl.pathname;
    if (path.startsWith("/api/health")) {
      // Always allow health probes during maintenance
    } else if (path.startsWith("/api/v1")) {
      return NextResponse.json(
        {
          error: "Service temporarily unavailable (maintenance).",
          code: "maintenance",
        },
        { status: 503 },
      );
    } else if (path.startsWith("/dashboard") || path.startsWith("/reports")) {
      return new NextResponse(
        "MoneyGap AI is temporarily under maintenance. Please try again shortly.",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
  }

  // OAuth provider redirects back without a Clerk session cookie reliably;
  // state token carries workspace identity.
  if (isPublicOAuthCallback(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
