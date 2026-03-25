import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export function extractRequestMeta(req: Request): { ipHash: string | null; userAgent: string; channel: string } {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") ?? "";
  const channel = (req.headers.get("x-share-channel") ?? "unknown").trim() || "unknown";
  return { ipHash: hashIp(ip), userAgent: ua.slice(0, 500), channel: channel.slice(0, 40) };
}

export async function writeShareUnlockLog(params: {
  supabase: SupabaseClient;
  userId: string;
  dateKst: string;
  action: "grant" | "consume" | "consume_blocked";
  channel: string;
  ipHash: string | null;
  userAgent: string;
  detail?: Record<string, unknown>;
}) {
  const { supabase, userId, dateKst, action, channel, ipHash, userAgent, detail } = params;
  const { error } = await supabase.from("daily_share_unlock_logs").insert({
    user_id: userId,
    date_kst: dateKst,
    action,
    channel,
    ip_hash: ipHash,
    user_agent: userAgent || null,
    detail: detail ?? null,
  });
  if (error) {
    console.warn("[share-unlock-audit] insert failed:", error.message);
  }
}

