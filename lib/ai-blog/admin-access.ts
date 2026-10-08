import "server-only";
import { createServiceSupabase } from "@/lib/supabase-server";
import { addDays, addMonths, computeAccess, EXPIRY_WARNING_DAYS, type AccessRow } from "@/lib/ai-blog/access";
import { kstToday, monthRangeIso } from "@/lib/ai-blog/stats";
import type { AccessState } from "@/lib/ai-blog/types";

export type AccessFilter = "all" | "active" | "expiring" | "expired" | "suspended";

export type AdminAccessRow = {
  user_id: string;
  email: string | null;
  company_name: string | null;
  plan_code: string;
  plan_name: string;
  state: AccessState;
  expires_on: string;
  days_left: number | null;
  memo: string | null;
  contents_used: number;
  monthly_limit: number;
  cost_krw: number;
  updated_at: string;
};

export type AdminPlan = { code: string; name: string; monthly_price_krw: number; monthly_content_limit: number };

export type AccessLog = {
  id: string;
  action: string;
  plan_code: string | null;
  prev_expires_on: string | null;
  new_expires_on: string | null;
  amount_krw: number | null;
  payer_name: string | null;
  memo: string | null;
  actor_email: string | null;
  created_at: string;
};

type DbAccess = AccessRow & { user_id: string; memo: string | null; updated_at: string };

function escapeLike(v: string) {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function loadPlans(): Promise<AdminPlan[]> {
  const db = createServiceSupabase().schema("cleanidex");
  const { data } = await db
    .from("ai_plans")
    .select("code, name, monthly_price_krw, monthly_content_limit")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as AdminPlan[];
}

export async function loadAccessList(opts: { q?: string; filter?: AccessFilter }): Promise<AdminAccessRow[]> {
  const service = createServiceSupabase();
  const db = service.schema("cleanidex");

  let userFilter: string[] | null = null;
  const q = opts.q?.trim();
  if (q) {
    const { data: found } = await service.from("profiles").select("id").ilike("email", `%${escapeLike(q)}%`).limit(200);
    userFilter = (found ?? []).map((p) => (p as { id: string }).id);
    if (!userFilter.length) return [];
  }

  let query = db
    .from("ai_blog_access")
    .select("user_id, plan_code, status, expires_on, memo, updated_at")
    .order("expires_on", { ascending: true })
    .limit(500);
  if (userFilter) query = query.in("user_id", userFilter);
  const { data: accessData } = await query;
  const access = (accessData ?? []) as DbAccess[];
  if (!access.length) return [];

  const userIds = access.map((a) => a.user_id);
  const period = kstToday().slice(0, 7);
  const range = monthRangeIso(period);

  const [{ data: profiles }, { data: members }, plans] = await Promise.all([
    service.from("profiles").select("id, email").in("id", userIds),
    db.from("users").select("id, company_id").in("id", userIds),
    loadPlans(),
  ]);
  const companyByUser = new Map(
    ((members ?? []) as { id: string; company_id: string | null }[]).map((m) => [m.id, m.company_id]),
  );
  const companyIds = [...new Set([...companyByUser.values()].filter((v): v is string => Boolean(v)))];

  const [{ data: companies }, { data: counters }, { data: logs }] = companyIds.length
    ? await Promise.all([
        db.from("companies").select("id, name").in("id", companyIds),
        db
          .from("ai_usage_counters")
          .select("company_id, contents_created")
          .eq("period", period.replace("-", ""))
          .in("company_id", companyIds),
        db
          .from("ai_usage_logs")
          .select("company_id, estimated_cost_krw")
          .in("company_id", companyIds)
          .gte("created_at", new Date(range.start).toISOString())
          .lt("created_at", new Date(range.end).toISOString())
          .limit(20000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const emailById = new Map(((profiles ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email]));
  const companyName = new Map(((companies ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  const usedByCompany = new Map(
    ((counters ?? []) as { company_id: string; contents_created: number }[]).map((c) => [c.company_id, c.contents_created]),
  );
  const costByCompany = new Map<string, number>();
  for (const l of (logs ?? []) as { company_id: string; estimated_cost_krw: number | null }[]) {
    costByCompany.set(l.company_id, (costByCompany.get(l.company_id) ?? 0) + Number(l.estimated_cost_krw ?? 0));
  }
  const planByCode = new Map(plans.map((p) => [p.code, p]));

  const rows = access.map((a): AdminAccessRow => {
    const computed = computeAccess(a);
    const companyId = companyByUser.get(a.user_id) ?? null;
    const plan = planByCode.get(a.plan_code);
    return {
      user_id: a.user_id,
      email: emailById.get(a.user_id) ?? null,
      company_name: companyId ? (companyName.get(companyId) ?? null) : null,
      plan_code: a.plan_code,
      plan_name: plan?.name ?? a.plan_code,
      state: computed.state,
      expires_on: a.expires_on,
      days_left: computed.days_left,
      memo: a.memo,
      contents_used: companyId ? (usedByCompany.get(companyId) ?? 0) : 0,
      monthly_limit: plan?.monthly_content_limit ?? 0,
      cost_krw: companyId ? (costByCompany.get(companyId) ?? 0) : 0,
      updated_at: a.updated_at,
    };
  });

  const filter = opts.filter ?? "all";
  return rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "expiring") return r.state === "active" && (r.days_left ?? 99) <= EXPIRY_WARNING_DAYS;
    return r.state === filter;
  });
}

export async function loadAccessLogs(userId: string): Promise<AccessLog[]> {
  const service = createServiceSupabase();
  const { data } = await service
    .schema("cleanidex")
    .from("ai_blog_access_logs")
    .select("id, action, plan_code, prev_expires_on, new_expires_on, amount_krw, payer_name, memo, actor_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const logs = (data ?? []) as (Omit<AccessLog, "actor_email"> & { actor_id: string | null })[];
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter((v): v is string => Boolean(v)))];
  const { data: actors } = actorIds.length
    ? await service.from("profiles").select("id, email").in("id", actorIds)
    : { data: [] };
  const emailById = new Map(((actors ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email]));
  return logs.map(({ actor_id, ...l }) => ({ ...l, actor_email: actor_id ? (emailById.get(actor_id) ?? null) : null }));
}

export type AccessAction =
  | { action: "extend"; months: number }
  | { action: "set_expiry"; expires_on: string }
  | { action: "change_plan"; plan_code: string }
  | { action: "suspend" }
  | { action: "resume" };

export type ApplyInput = {
  userId?: string;
  email?: string;
  planCode?: string;
  amountKrw?: number | null;
  payerName?: string | null;
  memo?: string | null;
  actorId: string;
} & AccessAction;

export async function applyAccessChange(input: ApplyInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceSupabase();
  const db = service.schema("cleanidex");

  let userId = input.userId ?? null;
  if (!userId && input.email) {
    const { data } = await service
      .from("profiles")
      .select("id")
      .ilike("email", escapeLike(input.email.trim()))
      .limit(1)
      .maybeSingle();
    userId = (data as { id: string } | null)?.id ?? null;
  }
  if (!userId) return { ok: false, error: "user_not_found" };

  const { data: currentData } = await db
    .from("ai_blog_access")
    .select("user_id, plan_code, status, expires_on, memo, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  const current = currentData as DbAccess | null;
  const today = kstToday();
  const plans = await loadPlans();

  let planCode = current?.plan_code ?? input.planCode ?? plans[0]?.code;
  let status = current?.status ?? "active";
  let expiresOn = current?.expires_on ?? null;
  let logAction: string = input.action;

  switch (input.action) {
    case "extend": {
      if (!Number.isInteger(input.months) || input.months < 1 || input.months > 36) {
        return { ok: false, error: "invalid_period" };
      }
      if (expiresOn && expiresOn >= today) {
        expiresOn = addMonths(expiresOn, input.months);
      } else {
        expiresOn = addDays(addMonths(today, input.months), -1);
      }
      if (!current) logAction = "grant";
      if (input.planCode) planCode = input.planCode;
      break;
    }
    case "set_expiry": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expires_on) || Number.isNaN(Date.parse(input.expires_on))) {
        return { ok: false, error: "invalid_date" };
      }
      expiresOn = input.expires_on;
      if (!current) logAction = "grant";
      if (input.planCode) planCode = input.planCode;
      break;
    }
    case "change_plan":
      if (!current) return { ok: false, error: "access_not_found" };
      planCode = input.plan_code;
      break;
    case "suspend":
      if (!current) return { ok: false, error: "access_not_found" };
      status = "suspended";
      break;
    case "resume":
      if (!current) return { ok: false, error: "access_not_found" };
      status = "active";
      break;
  }

  if (!planCode || !plans.some((p) => p.code === planCode)) return { ok: false, error: "plan_not_found" };
  if (!expiresOn) return { ok: false, error: "invalid_date" };

  const { error } = await db.from("ai_blog_access").upsert(
    {
      user_id: userId,
      plan_code: planCode,
      status,
      expires_on: expiresOn,
      memo: input.memo ?? current?.memo ?? null,
      granted_by: input.actorId,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  await db.from("ai_blog_access_logs").insert({
    user_id: userId,
    action: logAction,
    plan_code: planCode,
    prev_expires_on: current?.expires_on ?? null,
    new_expires_on: expiresOn,
    amount_krw: input.amountKrw ?? null,
    payer_name: input.payerName ?? null,
    memo: input.memo ?? null,
    actor_id: input.actorId,
  });

  return { ok: true };
}
