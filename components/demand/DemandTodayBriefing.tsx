"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemandReveal, DemandRevealInline } from "@/components/demand/DemandReveal";
import { formatMomPercent } from "@/lib/demand/copy";
import {
  DEMAND_DAILY_DEFAULT_GU_ROWS,
  DEMAND_DAILY_NATIONAL_KEYWORDS,
  DEMAND_TODAY_META,
  type DemandDailyGuRow,
} from "@/lib/demand/dummy-daily";
import { getDemandDistrictByGu } from "@/lib/demand/dummy-data";
import { guNameToSlug } from "@/lib/demand/slugs";

const WATCH_STORAGE_KEY = "cleanidex-demand-watchlist-v1";

type Props = { onGoMonth: () => void };

function KeywordPulseItem({
  name,
  percent,
}: {
  name: string;
  percent: number;
}) {
  return (
    <li>
      <DemandRevealInline closedLabel={name}>
        <p className="rounded-lg bg-violet-50/80 px-3 py-2 text-sm">
          <span className="font-semibold text-slate-900">{name}</span>
          <span className="ml-2 font-bold tabular-nums text-violet-900">
            {DEMAND_TODAY_META.compareLabel} {formatMomPercent(percent)}
          </span>
          <span className="ml-2 text-xs text-slate-500">(전국)</span>
        </p>
      </DemandRevealInline>
    </li>
  );
}

function GuTodayRow({ row }: { row: DemandDailyGuRow }) {
  return (
    <li>
      <DemandReveal
        label={row.gu}
        hint="탭하여 확인"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p>
            오늘 신규 입찰 <strong>{row.newTendersToday}</strong>건 (어제 {row.newTendersYesterday}건)
          </p>
          <p className="mt-2 text-slate-600">
            <Link href={`/demand/region/${row.slug}`} className="font-semibold text-teal-700 hover:underline">
              월간 지수 {row.monthlyIndex}
            </Link>
            <span className="text-slate-400"> · 구별 검색은 미제공</span>
          </p>
          {row.newTendersToday > 0 ? (
            <Link href="/tenders" className="mt-3 inline-block font-semibold text-teal-700 hover:underline">
              입찰 보기
            </Link>
          ) : null}
        </div>
      </DemandReveal>
    </li>
  );
}

export default function DemandTodayBriefing({ onGoMonth }: Props) {
  const [watched, setWatched] = useState<string[]>([]);

  const guRows = useMemo(() => {
    if (watched.length === 0) return DEMAND_DAILY_DEFAULT_GU_ROWS;
    const rows: DemandDailyGuRow[] = [];
    for (const gu of watched.slice(0, 5)) {
      const fromDefault = DEMAND_DAILY_DEFAULT_GU_ROWS.find((r) => r.gu === gu);
      if (fromDefault) {
        rows.push(fromDefault);
        continue;
      }
      const slug = guNameToSlug(gu);
      const district = getDemandDistrictByGu(gu);
      if (!slug) continue;
      rows.push({
        gu,
        slug,
        newTendersToday: 0,
        newTendersYesterday: 0,
        monthlyIndex: district?.indexScore ?? 0,
        monthlySignal: district?.signal ?? "neutral",
        note: "",
      });
    }
    return rows.length > 0 ? rows : DEMAND_DAILY_DEFAULT_GU_ROWS;
  }, [watched]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">오늘</p>
        <h2 className="text-2xl font-extrabold text-slate-900">{DEMAND_TODAY_META.briefingDateLabel}</h2>
      </header>

      <DemandReveal label="전국 검색" hint={`키워드 ${DEMAND_DAILY_NATIONAL_KEYWORDS.length}개`}>
        <ul className="space-y-2 pl-1">
          {DEMAND_DAILY_NATIONAL_KEYWORDS.map((k) => (
            <KeywordPulseItem key={k.id} name={k.name} percent={k.dayOverDayPercent} />
          ))}
        </ul>
        <Link href="/marketing-report" className="mt-3 inline-block text-xs font-semibold text-slate-500 hover:text-teal-700">
          마케팅 리포트 →
        </Link>
      </DemandReveal>

      <DemandReveal
        label="관심 구역"
        hint={`${guRows.length}개 · 입찰·지수는 구마다 열기`}
      >
        <ul className="space-y-2">
          {guRows.map((row) => (
            <GuTodayRow key={row.slug} row={row} />
          ))}
        </ul>
      </DemandReveal>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={onGoMonth}
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-teal-800"
        >
          이번 달 지수·TOP10
        </button>
      </div>

      <DemandReveal label="내 영업 구역 설정" hint="최대 5개">
        <DemandWatchlistCompact onChange={setWatched} />
      </DemandReveal>
    </div>
  );
}

function DemandWatchlistCompact({ onChange }: { onChange: (gu: string[]) => void }) {
  const [watched, setWatched] = useState<string[]>([]);
  const [pick, setPick] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCH_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setWatched(parsed);
      onChange(parsed);
    } catch {
      onChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: string[]) {
    setWatched(next);
    onChange(next);
    localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm"
      >
        <option value="">구 추가</option>
        {DEMAND_DAILY_DEFAULT_GU_ROWS.map((r) => (
          <option key={r.gu} value={r.gu} disabled={watched.includes(r.gu)}>
            {r.gu}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!pick || watched.length >= 5}
        onClick={() => {
          if (!pick) return;
          persist([...watched, pick]);
          setPick("");
        }}
        className="min-h-10 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        추가
      </button>
      {watched.length > 0 ? (
        <ul className="flex w-full flex-wrap gap-2">
          {watched.map((gu) => (
            <li key={gu}>
              <button
                type="button"
                onClick={() => persist(watched.filter((g) => g !== gu))}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {gu} ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
