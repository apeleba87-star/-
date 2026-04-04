import type { NextRequest } from "next/server";

/** Cron 라우트: `x-cron-secret` 또는 Vercel Cron의 `Authorization: Bearer CRON_SECRET` */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("x-cron-secret") === secret) return true;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return bearer === secret;
}
