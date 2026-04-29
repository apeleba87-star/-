import { createServerSupabase } from "@/lib/supabase-server";
import type { NextRequest } from "next/server";

type WriteAuditLogParams = {
  companyId: string;
  actorUserId: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
};

function getRequestIp(req?: NextRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

function getRequestDevice(req?: NextRequest): string | null {
  if (!req) return null;
  return req.headers.get("user-agent");
}

export async function writeCleanidexAuditLog(params: WriteAuditLogParams) {
  const supabase = await createServerSupabase();
  await supabase.schema("cleanidex").from("audit_logs").insert({
    company_id: params.companyId,
    actor_user_id: params.actorUserId,
    action: params.action,
    target_table: params.targetTable ?? null,
    target_id: params.targetId ?? null,
    ip: getRequestIp(params.req),
    device: getRequestDevice(params.req),
    metadata: params.metadata ?? {},
  });
}
