import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserTenderFocusRow } from "@/lib/tenders/user-focus";
import { isValidSido } from "@/lib/tenders/user-focus";

type NotifRow = {
  user_id: string;
  dedupe_key: string;
  kind: "tender_new" | "tender_deadline" | "job_application" | "subscription" | "system";
  title: string;
  body: string | null;
  link_path: string;
};

function formatKstDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function focusConfigured(focus: UserTenderFocusRow | null): boolean {
  if (!focus) return false;
  const industries = focus.industry_codes ?? [];
  return industries.length > 0 || isValidSido(focus.region_sido);
}

async function listTendersForFocus(
  supabase: SupabaseClient,
  focus: UserTenderFocusRow,
  filter: "new" | "deadline",
  limit: number
): Promise<{ id: string; bid_ntce_nm: string | null; bid_ntce_dt: string | null; bid_clse_dt: string | null }[]> {
  const industryCodes = focus.industry_codes ?? [];
  let tenderIds: string[] | null = null;
  if (industryCodes.length > 0) {
    const { data: idRows } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("industry_code", industryCodes);
    tenderIds = [...new Set((idRows ?? []).map((r) => r.tender_id))];
    if (tenderIds.length === 0) return [];
  }

  const nowIso = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  let q = supabase.from("tenders").select("id, bid_ntce_nm, bid_ntce_dt, bid_clse_dt");

  if (filter === "new") {
    q = q.gte("bid_clse_dt", nowIso).gte("bid_ntce_dt", sevenDaysAgo);
  } else {
    q = q.gt("bid_clse_dt", nowIso).lte("bid_clse_dt", in48h);
  }

  if (tenderIds != null) q = q.in("id", tenderIds);
  if (isValidSido(focus.region_sido)) {
    q = q.contains("region_sido_list", [focus.region_sido!]);
    if (focus.region_gugun && focus.region_gugun.length > 0) {
      q = q.ilike("bsns_dstr_nm", `%${focus.region_gugun}%`);
    }
  }

  q =
    filter === "deadline"
      ? q.order("bid_clse_dt", { ascending: true }).limit(limit)
      : q.order("bid_ntce_dt", { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) throw new Error(`listTendersForFocus: ${error.message}`);
  return (data ?? []) as {
    id: string;
    bid_ntce_nm: string | null;
    bid_ntce_dt: string | null;
    bid_clse_dt: string | null;
  }[];
}

async function upsertNotifications(supabase: SupabaseClient, rows: NotifRow[]): Promise<void> {
  for (const row of rows) {
    const { error } = await supabase.from("user_notifications").insert(row);
    if (!error) continue;
    const code = (error as { code?: string }).code;
    if (code === "23505") continue;
    throw new Error(`user_notifications insert: ${error.message}`);
  }
}

/**
 * 로그인 사용자 기준으로 알림 후보를 계산해 user_notifications에 삽입(중복 시 무시).
 * 클라이언트에서 주기적으로 또는 종 열 때 호출.
 */
export async function refreshUserNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const rows: NotifRow[] = [];

    const { data: focusRow } = await supabase
      .from("user_tender_focus")
      .select("user_id, region_sido, region_gugun, industry_codes, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const focus = focusRow as UserTenderFocusRow | null;

    if (focusConfigured(focus)) {
      const newTenders = await listTendersForFocus(supabase, focus!, "new", 15);
      for (const t of newTenders) {
        const title = (t.bid_ntce_nm ?? "입찰 공고").slice(0, 120);
        rows.push({
          user_id: userId,
          dedupe_key: `tender_new:${t.id}`,
          kind: "tender_new",
          title: `내 관심 조건 신규 공고: ${title}`,
          body: `공고일 ${formatKstDate(t.bid_ntce_dt)}`,
          link_path: `/tenders/${t.id}`,
        });
      }

      const deadlineTenders = await listTendersForFocus(supabase, focus!, "deadline", 10);
      for (const t of deadlineTenders) {
        const title = (t.bid_ntce_nm ?? "입찰 공고").slice(0, 120);
        rows.push({
          user_id: userId,
          dedupe_key: `tender_deadline:${t.id}`,
          kind: "tender_deadline",
          title: `마감 임박: ${title}`,
          body: `마감 ${formatKstDate(t.bid_clse_dt)}`,
          link_path: `/tenders/${t.id}`,
        });
      }
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: apps } = await supabase
      .from("job_applications")
      .select("id, status, updated_at, position_id")
      .eq("user_id", userId)
      .gte("updated_at", fourteenDaysAgo)
      .in("status", ["accepted", "rejected", "reviewing"]);

    if (apps && apps.length > 0) {
      const positionIds = [...new Set(apps.map((a) => a.position_id))];
      const { data: positions } = await supabase
        .from("job_post_positions")
        .select("id, job_post_id")
        .in("id", positionIds);
      const posMap = new Map((positions ?? []).map((p) => [p.id, p.job_post_id]));

      const jobPostIds = [...new Set([...posMap.values()].filter(Boolean))] as string[];
      const { data: posts } = await supabase.from("job_posts").select("id, title").in("id", jobPostIds);
      const titleMap = new Map((posts ?? []).map((p) => [p.id, p.title]));

      const statusLabel: Record<string, string> = {
        accepted: "채용 확정",
        rejected: "채용 결과",
        reviewing: "지원 검토 중",
      };

      for (const a of apps) {
        const jpId = posMap.get(a.position_id);
        if (!jpId) continue;
        const pt = (titleMap.get(jpId) ?? "구인 공고").slice(0, 80);
        const label = statusLabel[a.status] ?? "지원 상태 변경";
        rows.push({
          user_id: userId,
          dedupe_key: `job_app:${a.id}:${a.status}`,
          kind: "job_application",
          title: `${label}: ${pt}`,
          body: `업데이트 ${formatKstDate(a.updated_at)}`,
          link_path: `/jobs/${jpId}`,
        });
      }
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, next_billing_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub && sub.status === "active" && sub.next_billing_at) {
      const bill = new Date(sub.next_billing_at + "T12:00:00");
      if (!Number.isNaN(bill.getTime())) {
        const days = (bill.getTime() - Date.now()) / 86400000;
        if (days >= 0 && days <= 4) {
          const key = `sub_remind:${sub.next_billing_at}`;
          rows.push({
            user_id: userId,
            dedupe_key: key,
            kind: "subscription",
            title: "프리미엄 구독 결제 예정",
            body: `${sub.next_billing_at}에 결제가 예정되어 있습니다.`,
            link_path: "/mypage",
          });
        }
      }
    }

    await upsertNotifications(supabase, rows);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알림 갱신 실패";
    return { ok: false, error: msg };
  }
}
