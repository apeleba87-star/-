"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDemandDistrictByGu } from "@/lib/demand/dummy-data";
import { guNameToSlug, SEOUL_GU_NAMES } from "@/lib/demand/slugs";

const STORAGE_KEY = "cleanidex-demand-watchlist-v1";

export default function DemandWatchlist() {
  const [watched, setWatched] = useState<string[]>([]);
  const [pick, setPick] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWatched(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: string[]) {
    setWatched(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function add() {
    if (!pick || watched.includes(pick) || watched.length >= 5) return;
    persist([...watched, pick]);
    setPick("");
  }

  function remove(gu: string) {
    persist(watched.filter((g) => g !== gu));
  }

  const slugs = watched.map((g) => guNameToSlug(g)).filter(Boolean);

  return (
    <section className="rounded-2xl border border-dashed border-teal-200/80 bg-teal-50/30 p-5">
      <h3 className="text-sm font-bold text-slate-900">내 영업 구역</h3>
      <p className="mt-1 text-xs text-slate-600">관심 구 최대 5개 · 이 기기에만 저장됩니다.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">구 선택</option>
          {SEOUL_GU_NAMES.map((gu) => (
            <option key={gu} value={gu} disabled={watched.includes(gu)}>
              {gu}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!pick || watched.length >= 5}
          className="min-h-10 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {watched.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {watched.map((gu) => {
            const d = getDemandDistrictByGu(gu);
            const slug = guNameToSlug(gu);
            return (
              <li
                key={gu}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-200"
              >
                {slug ? (
                  <Link href={`/demand/region/${slug}`} className="font-medium text-teal-800">
                    {gu}
                    {d ? ` · ${d.indexScore}` : ""}
                  </Link>
                ) : (
                  <span>{gu}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(gu)}
                  className="ml-1 text-slate-400 hover:text-rose-600"
                  aria-label={`${gu} 제거`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {slugs.length >= 2 ? (
        <Link
          href={`/demand/compare?${slugs.slice(0, 3).map((s, i) => `gu${i + 1}=${s}`).join("&")}`}
          className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline"
        >
          내 구역 비교표 열기 →
        </Link>
      ) : null}
    </section>
  );
}
