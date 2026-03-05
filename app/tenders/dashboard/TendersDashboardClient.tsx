"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Item = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  is_clean_related?: boolean;
};

function dday(clseDt: string | null): string {
  if (!clseDt) return "";
  const end = new Date(clseDt).getTime();
  const day = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

export default function TendersDashboardClient({
  cleanOnly,
  closingSoon,
}: {
  cleanOnly: boolean;
  closingSoon: Item[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleCleanOnly() {
    const next = cleanOnly ? "0" : "1";
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("clean_only", next);
    router.push(`/tenders/dashboard?${nextParams.toString()}`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">마감 임박 (24~72시간)</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={cleanOnly}
            onChange={toggleCleanOnly}
            className="rounded border-slate-300"
          />
          청소 관련만 보기
        </label>
      </div>
      {!closingSoon.length ? (
        <p className="text-slate-500">해당 기간 내 마감 공고가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {closingSoon.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tenders/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{t.bid_ntce_nm || "(제목 없음)"}</span>
                <span className="text-sm text-slate-500">{t.ntce_instt_nm}</span>
                <span className="text-sm font-medium text-red-600">{dday(t.bid_clse_dt)}</span>
                <span className="text-sm text-slate-500">
                  {t.bid_clse_dt ? new Date(t.bid_clse_dt).toLocaleString("ko-KR") : ""}
                </span>
                {t.is_clean_related && (
                  <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">청소</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
