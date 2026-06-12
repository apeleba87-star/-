"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import RadarAdPlacementLivePreview from "@/components/advertise/RadarAdPlacementLivePreview";
import {
  RADAR_AD_INQUIRY_SCOPE_SUMMARY,
  RADAR_AD_INQUIRY_SURFACES,
  type RadarAdInquiryPlacementScope,
} from "@/lib/demand/radar-ad-inquiry-placements";
import {
  resolveRadarAdInquiryLivePreview,
  type RadarAdInquiryPreviewContext,
} from "@/lib/demand/radar-ad-inquiry-live-preview";
import { cn } from "@/lib/utils";

type Filter = "all" | RadarAdInquiryPlacementScope;

type Props = {
  previewContext: RadarAdInquiryPreviewContext;
};

export default function RadarAdPlacementExplorer({ previewContext }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState(RADAR_AD_INQUIRY_SURFACES[0]?.id ?? "demand");

  const active = useMemo(
    () => RADAR_AD_INQUIRY_SURFACES.find((s) => s.id === activeId) ?? RADAR_AD_INQUIRY_SURFACES[0],
    [activeId]
  );

  const livePreview = useMemo(
    () => (active ? resolveRadarAdInquiryLivePreview(active, previewContext) : null),
    [active, previewContext]
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "전체 보기" },
    { id: "national", label: "전국 광고" },
    { id: "regional", label: "지역 광고" },
  ];

  return (
    <section className="space-y-6" aria-labelledby="placement-explorer-heading">
      <div>
        <h2 id="placement-explorer-heading" className="text-lg font-bold text-slate-900">
          광고가 붙는 위치
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          아래는 <span className="font-medium text-slate-800">실제 서비스 화면</span>입니다.{" "}
          <span className="font-medium text-teal-700">청록·초록 테두리</span>가 직거래 배너 위치입니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f.id
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
          <p className="text-sm font-semibold text-teal-900">
            {RADAR_AD_INQUIRY_SCOPE_SUMMARY.national.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-teal-800/90">
            {RADAR_AD_INQUIRY_SCOPE_SUMMARY.national.description}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            {RADAR_AD_INQUIRY_SCOPE_SUMMARY.regional.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800/90">
            {RADAR_AD_INQUIRY_SCOPE_SUMMARY.regional.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {RADAR_AD_INQUIRY_SURFACES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId(s.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              activeId === s.id
                ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="block">{s.productLabel}</span>
            <span className="block text-xs font-normal text-slate-500">{s.pageLabel}</span>
          </button>
        ))}
      </div>

      {active ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">{active.pageLabel}</h3>
              <p className="mt-1 text-sm text-slate-600">{active.audienceNote}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">{active.pagePath}</p>
            </div>
            <Link
              href={active.previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-medium text-teal-700 hover:underline"
            >
              실제 화면 열어보기 →
            </Link>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>· 배너 비율 3:1 · 슬롯당 최대 5개 광고 로테이션</li>
              <li>· 노출·클릭 집계 제공 (계약 후)</li>
            </ul>
          </div>
          {livePreview ? (
            <RadarAdPlacementLivePreview
              baseHref={livePreview.href}
              scrollToY={livePreview.scrollToY}
              height={livePreview.height}
              filter={filter}
              title={`${active.pageLabel} 광고 위치 미리보기`}
            />
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">서비스</th>
              <th className="px-4 py-2.5 font-medium">화면</th>
              <th className="px-4 py-2.5 font-medium">전국</th>
              <th className="px-4 py-2.5 font-medium">지역</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {RADAR_AD_INQUIRY_SURFACES.map((s) => {
              const hasNational = s.wireframe.some((b) => b.scope === "national");
              const hasRegional = s.wireframe.some((b) => b.scope === "regional");
              return (
                <tr key={s.id} className="bg-white">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{s.productLabel}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.pageLabel}</td>
                  <td className="px-4 py-2.5">{hasNational ? "○" : "—"}</td>
                  <td className="px-4 py-2.5">{hasRegional ? "○" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
