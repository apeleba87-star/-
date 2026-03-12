import { createServerSupabase } from "@/lib/supabase-server";
import SendNewsletterButton from "@/components/admin/SendNewsletterButton";

export default async function AdminNewsletterPage() {
  const supabase = await createServerSupabase();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledFor = tomorrow.toISOString().slice(0, 10);

  const { data: queue } = await supabase
    .from("newsletter_queue")
    .select("id, type, title, summary, ref_type, scheduled_for, created_at")
    .is("used_in_issue_id", null)
    .gte("scheduled_for", new Date().toISOString().slice(0, 10))
    .order("scheduled_for")
    .order("sort_order");

  const typeLabel: Record<string, string> = {
    auto: "자동",
    manual: "운영자",
    ugc: "UGC",
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">뉴스레터 큐 · 발송</h1>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">수동 발송</p>
          <p className="mt-0.5 text-sm text-slate-600">
            버튼을 누르면 그 시점의 큐(미사용 항목) 전체가 한 회차로 발송됩니다. 자동 발송과 별도로 원할 때만 사용하세요.
          </p>
        </div>
        <SendNewsletterButton />
      </div>
      <div className="mb-4 text-sm text-slate-500">
        아래는 다음 발송 예정 큐 (미사용 항목) 목록입니다.
      </div>
      {!queue?.length ? (
        <div className="card">
          <p className="text-slate-500">현재 큐에 항목이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            글 작성 시 &quot;다음 뉴스레터에 포함&quot;을 체크하거나, 자동 다이제스트가 생성되면 여기에 쌓입니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {typeLabel[item.type] ?? item.type}
                </span>
                <span className="ml-2 font-medium text-slate-800">{item.title || "(제목 없음)"}</span>
                {item.summary && (
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.summary}</p>
                )}
              </div>
              <span className="text-sm text-slate-500">
                {item.scheduled_for} · {new Date(item.created_at).toLocaleDateString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
