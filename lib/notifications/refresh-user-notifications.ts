import type { SupabaseClient } from "@supabase/supabase-js";

type NotifRow = {
  user_id: string;
  dedupe_key: string;
  kind: "subscription" | "system";
  title: string;
  body: string | null;
  link_path: string;
};

/**
 * 가벼운 알림 후보만 삽입(중복 시 무시).
 * 입찰 신규/마감·구인 지원 상태 알림은 생성하지 않음(종 열 때 지연 방지).
 * 청소 질문 답변 등은 발생 시점에 별도 insert.
 */
export async function refreshUserNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
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
          const row: NotifRow = {
            user_id: userId,
            dedupe_key: `sub_remind:${sub.next_billing_at}`,
            kind: "subscription",
            title: "프리미엄 구독 결제 예정",
            body: `${sub.next_billing_at}에 결제가 예정되어 있습니다.`,
            link_path: "/mypage",
          };
          const { error } = await supabase.from("user_notifications").insert(row);
          if (error) {
            const code = (error as { code?: string }).code;
            if (code !== "23505") {
              throw new Error(`user_notifications insert: ${error.message}`);
            }
          }
        }
      }
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알림 갱신 실패";
    return { ok: false, error: msg };
  }
}
