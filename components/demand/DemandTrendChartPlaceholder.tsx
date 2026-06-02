/** Phase 0 — 판다랭크 검색추세 그래프 자리 (더미) */
export default function DemandTrendChartPlaceholder({ gu }: { gu: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
      <p className="text-xs font-semibold text-slate-600">{gu} · 거래·검색 추세</p>
      <p className="mt-1 text-[11px] text-slate-400">월별 전월세·매매 건수 차트 (더미 · Phase 1)</p>
      <div className="mx-auto mt-4 flex h-16 max-w-md items-end justify-center gap-1">
        {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
          <div
            key={i}
            className="w-6 rounded-t bg-teal-200/80"
            style={{ height: `${h}%` }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
