import { NextResponse } from "next/server";
import {
  completeOAuthConnect,
  verifyOAuthState,
  IntegrationCryptoError,
} from "@/lib/integrations";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const appUrl =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    url.origin;
  const redirectBase = `${appUrl}/dashboard/integrations`;

  if (err) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(err)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("missing_code_or_state")}`,
    );
  }

  try {
    const payload = verifyOAuthState(state);
    if (payload.providerSlug !== slug) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("state_mismatch")}`,
      );
    }
    await completeOAuthConnect({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      providerSlug: slug,
      code,
    });
    return NextResponse.redirect(
      `${redirectBase}?connected=${encodeURIComponent(slug)}`,
    );
  } catch (e) {
    const message =
      e instanceof IntegrationCryptoError
        ? e.message
        : e instanceof Error
          ? e.message
          : "oauth_failed";
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(message)}`,
    );
  }
}
