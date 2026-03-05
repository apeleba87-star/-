import { createServerSupabase } from "@/lib/supabase-server";
import HomeAdsManager from "./HomeAdsManager";

export default async function AdminAdsPage() {
  const supabase = await createServerSupabase();

  const [{ data: slots }, { data: campaigns }] = await Promise.all([
    supabase
      .from("home_ad_slots")
      .select("id, key, name, enabled")
      .order("key"),
    supabase
      .from("home_ad_campaigns")
      .select("id, home_ad_slot_id, title, description, cta_text, cta_url, image_url, start_date, end_date, sort_order")
      .order("sort_order"),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">홈 광고 슬롯</h1>
      <p className="mb-6 text-sm text-slate-600">
        슬롯을 끄면 해당 자리는 빈칸으로 표시됩니다. 켜면 기간·대기순서에 따라 캠페인 1건이 노출됩니다. 이미지/GIF 업로드, 기간, 대기순서를 설정하세요.
      </p>
      <HomeAdsManager slots={slots ?? []} campaigns={campaigns ?? []} />
    </div>
  );
}
