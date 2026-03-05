import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 60;

function dday(clseDt: string | null): string {
  if (!clseDt) return "—";
  const end = new Date(clseDt).getTime();
  const now = Date.now();
  const day = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: tender, error } = await supabase.from("tenders").select("*").eq("id", id).single();
  if (error || !tender) notFound();

  const { data: detail } = await supabase.from("tender_details").select("*").eq("tender_id", id).single();
  const { data: regions } = await supabase.from("tender_regions").select("*").eq("tender_id", id);
  const { data: licenses } = await supabase.from("tender_licenses").select("*").eq("tender_id", id).order("sort_order");
  const { data: changes } = await supabase.from("tender_changes").select("*").eq("tender_id", id).order("chg_dt", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/tenders" className="mb-6 inline-block text-sm text-blue-600 hover:underline">← 목록</Link>
      <article className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{(tender.bid_ntce_nm as string) || "(제목 없음)"}</h1>
          {(tender.keywords_matched as string[])?.length > 0 && (
            <span className="rounded bg-emerald-100 px-2 py-1 text-sm text-emerald-800">청소 관련</span>
          )}
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">공고번호</dt><dd className="font-medium">{tender.bid_ntce_no as string}</dd></div>
          <div><dt className="text-sm text-slate-500">공고기관</dt><dd>{tender.ntce_instt_nm as string}</dd></div>
          <div><dt className="text-sm text-slate-500">수요기관</dt><dd>{tender.dmand_instt_nm as string}</dd></div>
          <div><dt className="text-sm text-slate-500">지역/사업지역</dt><dd>{tender.bsns_dstr_nm as string}</dd></div>
          <div><dt className="text-sm text-slate-500">계약방법</dt><dd>{tender.cntrct_mthd_nm as string}</dd></div>
          <div><dt className="text-sm text-slate-500">기초금액</dt><dd>{tender.base_amt != null ? `${Number(tender.base_amt).toLocaleString()}원` : "—"}</dd></div>
          <div><dt className="text-sm text-slate-500">공고일시</dt><dd>{tender.bid_ntce_dt ? new Date(tender.bid_ntce_dt as string).toLocaleString("ko-KR") : "—"}</dd></div>
          <div><dt className="text-sm text-slate-500">입찰마감</dt><dd>{tender.bid_clse_dt ? new Date(tender.bid_clse_dt as string).toLocaleString("ko-KR") : "—"}</dd></div>
          <div><dt className="text-sm text-slate-500">개찰일시</dt><dd>{tender.openg_dt ? new Date(tender.openg_dt as string).toLocaleString("ko-KR") : "—"}</dd></div>
          <div><dt className="text-sm text-slate-500">D-day</dt><dd className="font-medium text-slate-800">{dday(tender.bid_clse_dt as string)}</dd></div>
        </dl>
        {detail?.qual_req_summary && (
          <section className="mt-6 border-t border-slate-200 pt-4">
            <h2 className="text-lg font-semibold text-slate-800">참가자격 요약</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-600">{detail.qual_req_summary as string}</p>
          </section>
        )}
        {regions && regions.length > 0 && (
          <section className="mt-6 border-t border-slate-200 pt-4">
            <h2 className="text-lg font-semibold text-slate-800">참가가능지역</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {regions.map((r) => (
                <li key={r.id} className="rounded bg-slate-100 px-2 py-1 text-sm">{r.region_nm ?? r.region_code}</li>
              ))}
            </ul>
          </section>
        )}
        {licenses && licenses.length > 0 && (
          <section className="mt-6 border-t border-slate-200 pt-4">
            <h2 className="text-lg font-semibold text-slate-800">면허/업종 제한</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {licenses.map((l) => (
                <li key={l.id}>{l.license_nm} {l.license_detail}</li>
              ))}
            </ul>
          </section>
        )}
        {changes && changes.length > 0 && (
          <section className="mt-6 border-t border-slate-200 pt-4">
            <h2 className="text-lg font-semibold text-slate-800">변경이력</h2>
            <ul className="mt-2 space-y-2">
              {changes.map((c) => (
                <li key={c.id} className="text-sm">
                  <time className="text-slate-500">{c.chg_dt ? new Date(c.chg_dt as string).toLocaleString("ko-KR") : ""}</time>
                  <span className="ml-2">{c.chg_summary as string}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tender.ntce_url && (
          <p className="mt-6">
            <a href={tender.ntce_url as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              나라장터 원문 보기 →
            </a>
          </p>
        )}
      </article>
    </div>
  );
}
