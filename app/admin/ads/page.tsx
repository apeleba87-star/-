import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export default async function AdminAdsPage() {
  const supabase = await createServerSupabase();
  const { data: slots } = await supabase
    .from("ad_slots")
    .select("id, advertiser_name, link_url, from_date, to_date, slot_index")
    .order("from_date", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">광고 슬롯</h1>
      <p className="mb-6 text-sm text-slate-600">
        뉴스레터에 노출할 광고를 등록합니다. (추가·수정 폼은 필요 시 확장)
      </p>
      {!slots?.length ? (
        <div className="card">
          <p className="text-slate-500">등록된 광고 슬롯이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {slots.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-800">{s.advertiser_name ?? "(이름 없음)"}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {s.from_date} ~ {s.to_date} · 슬롯 #{s.slot_index}
                </span>
                {s.link_url && (
                  <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm text-blue-600 hover:underline">
                    링크
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
