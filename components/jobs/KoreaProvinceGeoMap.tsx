import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { ProvinceAvg } from "@/components/jobs/job-wage-map-types";
import { sidoFromGeoFeatureName } from "@/lib/maps/korea-geo-name-to-sido";

import geoRaw from "@/lib/maps/skorea-provinces-simple.json";

const geo = geoRaw as FeatureCollection<Geometry, GeoJsonProperties>;

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  provinceByName: Map<string, ProvinceAvg>;
  highlightTopN: number;
};

/**
 * 행정구역 GeoJSON 기반 대한민국 시·도 지도. 상위 N개 시도는 색으로 강조하고, 금액은 지도 밖 카드에만 표시합니다.
 */
export default function KoreaProvinceGeoMap({ provinceByName, highlightTopN }: Props) {
  const w = 520;
  const h = 620;
  const pad = 12;

  const ranked = [...provinceByName.entries()]
    .filter(([, v]) => v.jobPostCount > 0)
    .sort((a, b) => b[1].avgDailyWage - a[1].avgDailyWage);
  const topSido = new Set(ranked.slice(0, highlightTopN).map(([k]) => k));

  const projection = geoMercator().fitExtent(
    [
      [pad, pad],
      [w - pad, h - pad],
    ],
    geo
  );
  const pathFn = geoPath(projection);

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-slate-500">
        통계청 2018 시도 경계(단순화) 기준입니다. 실제 행정 경계와 약간 다를 수 있습니다.
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mx-auto h-auto w-full max-w-lg overflow-visible rounded-2xl border border-slate-200/90 bg-sky-50/40 shadow-inner"
        role="img"
        aria-label="대한민국 시도별 평균 일당 지도"
      >
        <title>대한민국 시·도 지도</title>
        {geo.features.map((feature, i) => {
          const name = String(feature.properties?.name ?? "");
          const sido = sidoFromGeoFeatureName(name);
          const row = sido ? provinceByName.get(sido) : undefined;
          const hasData = row && row.jobPostCount > 0;
          const isTop = Boolean(sido && topSido.has(sido));
          const d = pathFn(feature as Feature<Geometry, GeoJsonProperties>);
          if (!d) return null;

          let fill = "#e2e8f0";
          let stroke = "#cbd5e1";
          if (hasData && isTop) {
            fill = "#5eead4";
            stroke = "#0d9488";
          } else if (hasData) {
            fill = "#ccfbf1";
            stroke = "#94a3b8";
          }

          return (
            <path
              key={`${name}-${i}`}
              d={d}
              fill={fill}
              stroke={stroke}
              strokeWidth={isTop ? 2 : 1}
              className={isTop ? "drop-shadow-sm" : ""}
            />
          );
        })}

        {geo.features.map((feature, i) => {
          const name = String(feature.properties?.name ?? "");
          const sido = sidoFromGeoFeatureName(name);
          if (!sido) return null;
          const row = provinceByName.get(sido);
          const hasData = row && row.jobPostCount > 0;
          const isTop = topSido.has(sido);
          const c = geoCentroid(feature as Feature<Geometry, GeoJsonProperties>);
          const projected = projection(c);
          if (!projected) return null;
          const [x, y] = projected;

          return (
            <g key={`lbl-${name}-${i}`}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                className="pointer-events-none select-none"
                style={{
                  fontSize: isTop && hasData ? 11 : 10,
                  fontWeight: isTop && hasData ? 700 : 600,
                  fill: isTop && hasData ? "#134e4a" : "#475569",
                }}
              >
                {sido}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mx-auto mt-5 max-w-2xl">
        <p className="mb-2 text-center text-xs font-medium text-slate-500">평균 일당 상위 {highlightTopN}곳</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {ranked.slice(0, highlightTopN).map(([name, v], idx) => (
            <div
              key={name}
              className="flex flex-col gap-1 rounded-xl border-2 border-teal-200/90 bg-gradient-to-br from-teal-50/90 to-white px-3 py-2.5 shadow-sm ring-1 ring-teal-100/80"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white"
                  aria-hidden
                >
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-900">{name}</span>
              </div>
              <p className="pl-9 text-base font-bold tabular-nums tracking-tight text-teal-900">{formatWon(v.avgDailyWage)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
