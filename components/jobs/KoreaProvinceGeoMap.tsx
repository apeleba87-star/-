import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { ProvinceAvg } from "@/components/jobs/job-wage-map-types";
import { sidoFromGeoFeatureName } from "@/lib/maps/korea-geo-name-to-sido";
import {
  WAGE_MAP_RANK_BADGE_CLASS,
  WAGE_MAP_RANK_CARD_CLASS,
  WAGE_MAP_RANK_AMOUNT_CLASS,
  WAGE_MAP_RANK_META,
} from "@/lib/jobs/wage-map-rank-palette";

import geoRaw from "@/lib/maps/skorea-provinces-simple.json";

const geo = geoRaw as FeatureCollection<Geometry, GeoJsonProperties>;

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  provinceByName: Map<string, ProvinceAvg>;
  highlightTopN: number;
};

const FILL_OTHER_DATA = "#c8e6d9";
const FILL_NO_DATA = "#cbd5e1";

/**
 * 상위 N개 시·도는 1~N위마다 지도·카드에서 동일한 색. 범례에 순위·지역명을 표시합니다.
 */
export default function KoreaProvinceGeoMap({ provinceByName, highlightTopN }: Props) {
  const w = 580;
  const h = 660;
  const pad = 22;

  const ranked = [...provinceByName.entries()]
    .filter(([, v]) => v.jobPostCount > 0)
    .sort((a, b) => b[1].avgDailyWage - a[1].avgDailyWage);

  const n = Math.min(highlightTopN, WAGE_MAP_RANK_META.length, ranked.length);
  const rankBySido = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    rankBySido.set(ranked[i]![0], i + 1);
  }

  const projection = geoMercator().fitExtent(
    [
      [pad, pad],
      [w - pad, h - pad],
    ],
    geo
  );
  const pathFn = geoPath(projection);

  const legendItems = ranked.slice(0, n).map(([sido], idx) => ({
    rank: idx + 1,
    sido,
    fill: WAGE_MAP_RANK_META[idx]!.fill,
  }));

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-md ring-1 ring-slate-100 sm:p-6">
        <h3 className="text-center text-base font-bold text-slate-800">시·도 지도</h3>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-slate-600">
          {n > 0 ? (
            <>
              <strong className="text-slate-800">1위~{n}위</strong>는 지도에서 색이 서로 다르고, 아래 카드와 같은 색입니다.
            </>
          ) : (
            <>표시할 순위 데이터가 없습니다.</>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-slate-200/80 py-3">
          {legendItems.map(({ rank, sido, fill }) => (
            <span key={sido} className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <span
                className="h-5 w-5 shrink-0 rounded-md border border-white shadow ring-1 ring-black/10"
                style={{ backgroundColor: fill }}
                aria-hidden
              />
              <span className="tabular-nums">{rank}위</span>
              <span className="text-slate-500">{sido}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="h-5 w-5 rounded-md border border-slate-200" style={{ backgroundColor: FILL_OTHER_DATA }} aria-hidden />
            그 외
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="h-5 w-5 rounded-md border border-slate-200" style={{ backgroundColor: FILL_NO_DATA }} aria-hidden />
            없음
          </span>
        </div>

        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mx-auto mt-5 h-auto w-full max-w-lg overflow-visible"
          role="img"
          aria-label="시도별 평균 일당 순위를 색으로 표시한 지도"
        >
          <title>대한민국 시·도 지도</title>
          <defs>
            <filter id="wageMapSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
            </filter>
          </defs>
          <rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={14} />
          <g filter="url(#wageMapSoftShadow)">
            {geo.features.map((feature, i) => {
              const name = String(feature.properties?.name ?? "");
              const sido = sidoFromGeoFeatureName(name);
              const row = sido ? provinceByName.get(sido) : undefined;
              const hasData = row && row.jobPostCount > 0;
              const rank = sido ? rankBySido.get(sido) : undefined;
              const d = pathFn(feature as Feature<Geometry, GeoJsonProperties>);
              if (!d) return null;

              let fill = FILL_NO_DATA;
              if (rank) fill = WAGE_MAP_RANK_META[rank - 1]!.fill;
              else if (hasData) fill = FILL_OTHER_DATA;

              return (
                <path
                  key={`${name}-${i}`}
                  d={d}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={rank ? 2.25 : 2}
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        </svg>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          통계청 2018 시·도 경계를 단순화했습니다.
          {n > 0 ? " 범례 순서가 평균 일당 높은 순입니다." : ""}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <h3 className="text-center text-base font-bold text-slate-800">상위 {n}곳 평균 일당</h3>
        <p className="mt-1 text-center text-sm text-slate-500">지도 색과 동일한 순위입니다.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.slice(0, n).map(([name, v], idx) => {
            const cardCls = WAGE_MAP_RANK_CARD_CLASS[idx] ?? WAGE_MAP_RANK_CARD_CLASS[4];
            const badgeCls = WAGE_MAP_RANK_BADGE_CLASS[idx] ?? WAGE_MAP_RANK_BADGE_CLASS[4];
            const amtCls = WAGE_MAP_RANK_AMOUNT_CLASS[idx] ?? WAGE_MAP_RANK_AMOUNT_CLASS[4];
            return (
              <div
                key={name}
                className={`rounded-2xl border-2 px-4 py-3 shadow-sm ring-1 ${cardCls}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${badgeCls}`}
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-900">{name}</p>
                    <p className={`text-xl font-extrabold tabular-nums tracking-tight ${amtCls}`}>{formatWon(v.avgDailyWage)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
