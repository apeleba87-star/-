"use client";

import type { ProvinceAvg } from "@/components/jobs/job-wage-map-types";
import { REGION_SIDO_LIST, type RegionSido } from "@/lib/listings/regions";

export type { ProvinceAvg };

/** 단순화한 전국 시·도 블록 위치(%). 실제 경계와 다를 수 있음(안내용). */
const SIDO_LAYOUT: Record<RegionSido, { top: number; left: number; w: number; h: number }> = {
  강원: { top: 5, left: 38, w: 26, h: 24 },
  서울: { top: 30, left: 44, w: 13, h: 9 },
  경기: { top: 24, left: 32, w: 32, h: 20 },
  인천: { top: 28, left: 26, w: 13, h: 9 },
  세종: { top: 42, left: 45, w: 11, h: 8 },
  대전: { top: 44, left: 38, w: 13, h: 9 },
  충북: { top: 36, left: 40, w: 18, h: 14 },
  충남: { top: 48, left: 30, w: 20, h: 15 },
  전북: { top: 52, left: 36, w: 18, h: 15 },
  전남: { top: 62, left: 34, w: 20, h: 17 },
  광주: { top: 58, left: 32, w: 11, h: 9 },
  경북: { top: 34, left: 52, w: 24, h: 26 },
  대구: { top: 44, left: 56, w: 13, h: 10 },
  울산: { top: 48, left: 64, w: 13, h: 10 },
  부산: { top: 52, left: 62, w: 15, h: 11 },
  경남: { top: 56, left: 50, w: 24, h: 19 },
  제주: { top: 80, left: 40, w: 22, h: 14 },
};

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  /** 시·도별 집계(0건인 시도는 맵에서 흐리게) */
  provinceByName: Map<string, ProvinceAvg>;
  /** 평균 일당 기준 상위 N개 시도만 강조·금액 표시 */
  highlightTopN: number;
};

export default function JobWageSidoSchematicMap({ provinceByName, highlightTopN }: Props) {
  const ranked = [...provinceByName.entries()]
    .filter(([, v]) => v.jobPostCount > 0)
    .sort((a, b) => b[1].avgDailyWage - a[1].avgDailyWage);
  const topNames = new Set(ranked.slice(0, highlightTopN).map(([k]) => k));

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-slate-500">
        아래는 시·도 위치를 단순화한 안내 도식입니다. 실제 지도와 다를 수 있습니다.
      </p>
      <div
        className="relative mx-auto aspect-[5/7] w-full max-w-md rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-teal-50/30 shadow-inner"
        role="img"
        aria-label="전국 시도별 평균 일당 안내 도식. 상위 지역은 진한 색으로 표시됩니다."
      >
        {REGION_SIDO_LIST.map((sido) => {
          const layout = SIDO_LAYOUT[sido];
          const row = provinceByName.get(sido);
          const hasData = row && row.jobPostCount > 0;
          const isTop = hasData && topNames.has(sido);

          return (
            <div
              key={sido}
              className={`absolute flex flex-col items-center justify-center rounded-lg border-2 px-0.5 py-0.5 text-center transition-all sm:px-1 sm:py-1 ${
                !hasData
                  ? "border-slate-200/60 bg-white/40 text-slate-400"
                  : isTop
                    ? "z-10 border-teal-600 bg-teal-50 shadow-md ring-2 ring-teal-400/40"
                    : "border-slate-200/80 bg-white/70 text-slate-700"
              }`}
              style={{
                top: `${layout.top}%`,
                left: `${layout.left}%`,
                width: `${layout.w}%`,
                height: `${layout.h}%`,
              }}
            >
              <span className={`block w-full truncate font-bold leading-tight ${isTop ? "text-sm text-teal-900 sm:text-base" : "text-[10px] text-slate-600 sm:text-xs"}`}>
                {sido}
              </span>
              {hasData && isTop && (
                <span className="mt-0.5 hidden w-full truncate text-[9px] font-semibold tabular-nums text-teal-800 sm:block sm:text-[10px]">
                  {formatWon(row!.avgDailyWage)}
                </span>
              )}
              {hasData && !isTop && (
                <span className="mt-0.5 hidden w-full truncate text-[8px] tabular-nums text-slate-500 sm:block">·</span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mx-auto mt-4 max-w-md space-y-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-3 text-sm">
        {ranked.slice(0, highlightTopN).map(([name, v], i) => (
          <li key={name} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
            <span className="font-semibold text-slate-800">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs text-white">{i + 1}</span>
              {name}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-teal-800">{formatWon(v.avgDailyWage)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
