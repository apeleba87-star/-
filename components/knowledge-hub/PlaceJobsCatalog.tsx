"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlaceJobCard } from "@/lib/knowledge-hub/place-jobs/shared";
import { placeIdsWithJobs } from "@/lib/knowledge-hub/place-jobs/shared";
import { getPlaceLabel } from "@/lib/knowledge-hub/solutions/taxonomy";

type Props = {
  jobs: PlaceJobCard[];
  title?: string;
  subtitle?: string;
};

type Step = "place" | "jobs";

export default function PlaceJobsCatalog({
  jobs,
  title = "장소별 청소 방법",
  subtitle = "걸레질·루틴·동선 등 작업 방법을 고르세요. 오염 제거는 「오염으로 찾기」를 이용하세요.",
}: Props) {
  const [q, setQ] = useState("");
  const [placeId, setPlaceId] = useState("");

  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  const searchHits = useMemo(() => {
    if (!query) return [];
    return jobs.filter((j) => {
      const hay = [j.title, j.placeLabel, j.summary ?? ""].join(" ").toLowerCase().replace(/\s+/g, "");
      return hay.includes(query);
    });
  }, [jobs, query]);

  const places = useMemo(() => {
    const count = new Map<string, number>();
    for (const j of jobs) count.set(j.placeId, (count.get(j.placeId) ?? 0) + 1);
    return placeIdsWithJobs(jobs).map((id) => ({
      id,
      label: getPlaceLabel(id),
      n: count.get(id) ?? 0,
    }));
  }, [jobs]);

  const jobList = useMemo(() => {
    if (!placeId) return [];
    return jobs.filter((j) => j.placeId === placeId);
  }, [jobs, placeId]);

  const step: Step = !placeId ? "place" : "jobs";
  const placeLabel = places.find((p) => p.id === placeId)?.label;
  const searching = Boolean(query);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-base text-slate-600">{subtitle}</p>
      <p className="mt-2 text-sm text-slate-500">
        세제·오염 처방이 필요하면{" "}
        <Link href="/pollution" className="font-bold text-teal-800 hover:underline">
          오염으로 찾기
        </Link>
        로 이동하세요.
      </p>

      <div className="relative mt-6">
        <label htmlFor="place-job-search" className="sr-only">
          검색
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="place-job-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="예: 사무실 걸레질, 헬스장 락커, 학원 강의실"
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-800/25"
        />
      </div>

      {searching ? (
        <div className="mt-6">
          <p className="text-sm text-slate-500">{searchHits.length}건 일치</p>
          <ul className="mt-3 space-y-2">
            {searchHits.map((j) => (
              <li key={j.id}>
                <Link
                  href={j.path}
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-teal-300"
                >
                  <span className="block text-base font-black text-slate-950">{j.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{j.placeLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6">
          {step !== "place" ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaceId("")}
                className="inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                뒤로
              </button>
              <p className="text-sm text-slate-500">{placeLabel}</p>
            </div>
          ) : null}

          {step === "place" ? (
            <>
              <p className="text-base font-bold text-slate-800">어디에서 청소하나요?</p>
              <ul className="mt-3 space-y-2">
                {places.map((pl) => (
                  <li key={pl.id}>
                    <button
                      type="button"
                      onClick={() => setPlaceId(pl.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-teal-300"
                    >
                      <span className="text-lg font-black text-slate-950">{pl.label}</span>
                      <span className="text-sm font-bold text-slate-500">{pl.n}개 방법</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {step === "jobs" ? (
            <>
              <p className="text-base font-bold text-slate-800">무엇을 하시나요?</p>
              <ul className="mt-3 space-y-2">
                {jobList.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={j.path}
                      className="group flex items-center gap-3 rounded-2xl border-2 border-slate-900 bg-white px-4 py-4 transition hover:bg-teal-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-black text-slate-950">{j.title}</span>
                        {j.summary ? (
                          <span className="mt-1 block text-sm text-slate-600 line-clamp-2">{j.summary}</span>
                        ) : null}
                      </span>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-teal-800"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
