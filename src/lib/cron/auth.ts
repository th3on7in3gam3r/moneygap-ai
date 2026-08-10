export function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  // Prefer dedicated header — Clerk/CDN often treat Authorization: Bearer as a session JWT.
  if (req.headers.get("x-cron-secret")?.trim() === secret) return true;
  const header = req.headers.get("authorization")?.trim();
  if (header === `Bearer ${secret}`) return true;
  return false;
}
