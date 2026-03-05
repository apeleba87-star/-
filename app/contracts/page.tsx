import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 60;

export default async function ContractsPage() {
  const supabase = createClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_no, contract_dt, contract_amt, cntrct_instt_nm, contractor_nm, bid_ntce_no")
    .order("contract_dt", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">계약 현황</h1>
      <p className="mb-6 text-sm text-slate-600">
        계약정보서비스 연동 시 여기에 계약 목록이 표시됩니다.
      </p>
      {!contracts?.length ? (
        <div className="card">
          <p className="text-slate-500">등록된 계약이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg border border-slate-200 bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 font-semibold text-slate-800">계약번호</th>
                <th className="p-3 font-semibold text-slate-800">계약일</th>
                <th className="p-3 font-semibold text-slate-800">계약금액</th>
                <th className="p-3 font-semibold text-slate-800">계약기관</th>
                <th className="p-3 font-semibold text-slate-800">계약상대자</th>
                <th className="p-3 font-semibold text-slate-800">관련 공고번호</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium">{c.contract_no as string}</td>
                  <td className="p-3 text-slate-600">{c.contract_dt ? new Date(c.contract_dt as string).toLocaleDateString("ko-KR") : "—"}</td>
                  <td className="p-3">{c.contract_amt != null ? `${(Number(c.contract_amt) / 10000).toFixed(0)}만원` : "—"}</td>
                  <td className="p-3 text-slate-600">{c.cntrct_instt_nm as string}</td>
                  <td className="p-3 text-slate-600">{c.contractor_nm as string}</td>
                  <td className="p-3">
                    {c.bid_ntce_no ? <Link href={`/tenders?bid=${c.bid_ntce_no}`} className="text-blue-600 hover:underline">{c.bid_ntce_no as string}</Link> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
