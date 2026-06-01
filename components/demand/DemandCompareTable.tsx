"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ScopeBadge from "@/components/demand/ScopeBadge";
import { DemandReveal } from "@/components/demand/DemandReveal";
import { DEMAND_METRIC_LABELS, formatMomPercent } from "@/lib/demand/copy";
import {
  DEMAND_DEFAULT_COMPARE_SLUGS,
  DEMAND_TOP10,
  resolveCompareDistricts,
} from "@/lib/demand/dummy-data";
import { SEOUL_GU_NAMES, guNameToSlug } from "@/lib/demand/slugs";
import ChannelHints from "@/components/demand/ChannelHints";

export default function DemandCompareTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMetrics, setShowMetrics] = useState(false);

  const slugs = [
    searchParams.get("gu1"),
    searchParams.get("gu2"),
    searchParams.get("gu3"),
    searchParams.get("gu4"),
    searchParams.get("gu5"),
  ].filter((s): s is string => !!s);
  const districts =
    slugs.length > 0
      ? resolveCompareDistricts(slugs)
      : resolveCompareDistricts([...DEMAND_DEFAULT_COMPARE_SLUGS]);

  const nationalPacking = districts[0]?.drivers.find((d) => d.key === "packing_search")?.momPercent ?? 0;
  const nationalMoveIn =
    districts[0]?.drivers.find((d) => d.key === "move_in_clean_search")?.momPercent ?? 0;

  function setGu(slot: number, slug: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(`gu${slot}`, slug);
    router.push(`/demand/compare?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {districts.map((d, i) => (
          <li key={d.slug}>
            <Link
              href={`/demand/region/${d.slug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:border-teal-200"
            >
              {i + 1}. {d.gu}
            </Link>
          </li>
        ))}
      </ul>

      {!showMetrics ? (
        <button
          type="button"
          onClick={() => setShowMetrics(true)}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-800"
        >
          비교 수치 펼치기
        </button>
      ) : (
        <div className="space-y-4">
          <DemandReveal label="구 바꾸기" hint="드롭다운">
            <div className="flex flex-wrap gap-2">
              {DEMAND_TOP10.slice(0, 5).map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => {
                    router.push(
                      `/demand/compare?gu1=${districts[0]?.slug ?? DEMAND_DEFAULT_COMPARE_SLUGS[0]}&gu2=${districts[1]?.slug ?? DEMAND_DEFAULT_COMPARE_SLUGS[1]}&gu3=${d.slug}`
                    );
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:border-teal-300"
                >
                  + {d.gu}
                </button>
              ))}
            </div>
          </DemandReveal>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white ring-1 ring-slate-100/80">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">지표</th>
                  {districts.map((d, i) => (
                    <th key={d.slug} className="px-4 py-3 text-left">
                      <span className="font-bold text-slate-900">{d.gu}</span>
                      <select
                        className="mt-1 block w-full max-w-[140px] rounded-lg border border-slate-200 text-xs"
                        value={d.slug}
                        onChange={(e) => setGu(i + 1, e.target.value)}
                        aria-label={`${i + 1}번째 구 선택`}
                      >
                        {SEOUL_GU_NAMES.map((gu) => {
                          const slug = guNameToSlug(gu);
                          if (!slug) return null;
                          const inTop = DEMAND_TOP10.some((t) => t.slug === slug);
                          return (
                            <option key={slug} value={slug} disabled={!inTop}>
                              {gu}
                              {!inTop ? " (준비중)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{DEMAND_METRIC_LABELS.sale}</span>
                    <ScopeBadge scope="district" className="ml-2 inline-flex" />
                  </td>
                  {districts.map((d) => {
                    const driver = d.drivers.find((x) => x.key === "sale_trade");
                    const count = driver?.monthCount;
                    const mom = driver?.momPercent ?? 0;
                    return (
                      <td key={d.slug} className="px-4 py-3 font-semibold tabular-nums">
                        {count != null ? (
                          <>
                            <span className="block text-slate-900">{count.toLocaleString("ko-KR")}건</span>
                            <span className="block text-xs text-slate-500">{formatMomPercent(mom)}</span>
                          </>
                        ) : (
                          formatMomPercent(mom)
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{DEMAND_METRIC_LABELS.jeonse}</span>
                    <ScopeBadge scope="district" className="ml-2 inline-flex" />
                  </td>
                  {districts.map((d) => {
                    const driver = d.drivers.find((x) => x.key === "jeonse_wolse_trade");
                    const count = driver?.monthCount;
                    const mom = driver?.momPercent ?? 0;
                    return (
                      <td key={d.slug} className="px-4 py-3 font-semibold tabular-nums">
                        {count != null ? (
                          <>
                            <span className="block text-slate-900">{count.toLocaleString("ko-KR")}건</span>
                            <span className="block text-xs text-slate-500">{formatMomPercent(mom)}</span>
                          </>
                        ) : (
                          formatMomPercent(mom)
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{DEMAND_METRIC_LABELS.packing}</span>
                    <ScopeBadge scope="national" className="ml-2 inline-flex" />
                  </td>
                  {districts.map((d) => (
                    <td key={d.slug} className="px-4 py-3 font-semibold tabular-nums text-violet-900">
                      {formatMomPercent(nationalPacking)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">{DEMAND_METRIC_LABELS.moveInClean}</span>
                    <ScopeBadge scope="national" className="ml-2 inline-flex" />
                  </td>
                  {districts.map((d) => (
                    <td key={d.slug} className="px-4 py-3 font-semibold tabular-nums text-violet-900">
                      {formatMomPercent(nationalMoveIn)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">{DEMAND_METRIC_LABELS.composite}</td>
                  {districts.map((d) => (
                    <td key={d.slug} className="px-4 py-3 text-lg font-black tabular-nums text-teal-700">
                      {d.indexScore}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ChannelHints />
    </div>
  );
}
