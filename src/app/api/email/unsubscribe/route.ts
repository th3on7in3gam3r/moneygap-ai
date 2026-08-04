import {
  findPreferencesByUnsubscribeToken,
  unsubscribeMarketing,
} from "@/lib/email/preferences/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return new Response("Missing unsubscribe token.", { status: 400 });
  }
  const prefs = await findPreferencesByUnsubscribeToken(token);
  if (!prefs) {
    return new Response("Invalid or expired unsubscribe link.", { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribe · MoneyGap AI</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f4f6f4;color:#121816;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
  main{max-width:28rem;background:#fff;border:1px solid #d5ddd8;border-radius:16px;padding:28px 24px}
  h1{font-size:1.25rem;margin:0 0 8px}p{color:#5a6b62;font-size:.95rem;line-height:1.5}
  button{appearance:none;border:0;border-radius:12px;background:#0f7a56;color:#f3fff9;font:inherit;font-weight:600;padding:.75rem 1rem;cursor:pointer;width:100%}
  a{color:#0f7a56}
</style></head>
<body><main>
  <p style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0f7a56;margin:0 0 12px">MoneyGap AI</p>
  <h1>Unsubscribe from Growth Digest™?</h1>
  <p>This opts you out of the weekly digest and other marketing emails. Security notifications stay on unless you change them in settings.</p>
  <form method="POST" action="/api/email/unsubscribe?token=${encodeURIComponent(token)}">
    <button type="submit">Confirm unsubscribe</button>
  </form>
  <p style="margin-top:16px;font-size:12px"><a href="/dashboard/settings/email">Manage all email preferences</a></p>
</main></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return Response.json({ ok: false, error: "Missing token." }, { status: 400 });
  }
  const prefs = await unsubscribeMarketing(token);
  if (!prefs) {
    return Response.json({ ok: false, error: "Invalid token." }, { status: 404 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return Response.json({ ok: true, preferences: prefs });
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribed · MoneyGap AI</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f4f6f4">
<main style="max-width:28rem;background:#fff;border:1px solid #d5ddd8;border-radius:16px;padding:28px 24px">
  <h1 style="font-size:1.25rem">You’re unsubscribed</h1>
  <p style="color:#5a6b62">Growth Digest™ and marketing emails are off. You can re-enable anytime in
  <a href="/dashboard/settings/email" style="color:#0f7a56">Email preferences</a>.</p>
</main></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
