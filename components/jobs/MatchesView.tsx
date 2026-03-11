"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MatchItem } from "@/app/jobs/matches/page";
import { glassCard } from "@/lib/ui-styles";

type ViewMode = "list" | "calendar";

type Props = { matches: MatchItem[] };

export default function MatchesView({ matches }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <div className="mt-6">
      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-100/80 p-1" aria-label="보기 전환">
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          목록
        </button>
        <button
          type="button"
          onClick={() => setViewMode("calendar")}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            viewMode === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          달력
        </button>
      </nav>

      {viewMode === "list" && (
        <ul className="space-y-3">
          {matches
            .sort((a, b) => (a.workDate ?? "").localeCompare(b.workDate ?? ""))
            .map((m) => (
              <li key={m.applicationId}>
                <Link href={`/jobs/${m.jobPostId}`} className={`block ${glassCard} p-4 transition-colors hover:border-blue-200`}>
                  <h2 className="font-semibold text-slate-900">{m.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{m.positionLabel}</p>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
                    {m.workDate && (
                      <span>
                        {new Date(m.workDate + "T12:00:00").toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {m.startTime != null && m.endTime != null && (
                      <span>
                        {String(m.startTime).slice(0, 5)} ~ {String(m.endTime).slice(0, 5)}
                      </span>
                    )}
                    <span>{[m.region, m.district].filter(Boolean).join(" ")}</span>
                  </dl>
                  <span className="mt-2 inline-block text-xs font-medium text-blue-600">상세 보기 →</span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      {viewMode === "calendar" && <MatchesCalendar matches={matches} />}
    </div>
  );
}

function MatchesCalendar({ matches }: Props) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { firstDay, daysInMonth, monthLabel } = useMemo(() => {
    const y = current.year;
    const m = current.month;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstDay = first.getDay();
    const daysInMonth = last.getDate();
    const monthLabel = `${y}년 ${m + 1}월`;
    return { firstDay, daysInMonth, monthLabel };
  }, [current.year, current.month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, MatchItem[]>();
    for (const m of matches) {
      if (!m.workDate) continue;
      const list = map.get(m.workDate) ?? [];
      list.push(m);
      map.set(m.workDate, list);
    }
    return map;
  }, [matches]);

  const goPrev = () => {
    setCurrent((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  };
  const goNext = () => {
    setCurrent((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const leadingBlanks = firstDay;
  const totalCells = leadingBlanks + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <div className={`${glassCard} overflow-hidden p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={goPrev} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="이전 달">
          ←
        </button>
        <span className="font-semibold text-slate-900">{monthLabel}</span>
        <button type="button" onClick={goNext} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="다음 달">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500">
        {weekDays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {Array.from({ length: rows * 7 }, (_, i) => {
          const dayNum = i - leadingBlanks + 1;
          const isInMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const dateStr = isInMonth
            ? `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            : null;
          const dayEvents = dateStr ? (eventsByDate.get(dateStr) ?? []) : [];

          return (
            <div
              key={i}
              className={`min-h-[72px] bg-white p-1 ${!isInMonth ? "bg-slate-50/80" : ""}`}
            >
              {isInMonth && (
                <>
                  <span className="text-sm font-medium text-slate-700">{dayNum}</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((m) => {
                      const regionDisplay = [m.region, m.district].filter(Boolean).join(" ");
                      return (
                        <li key={m.applicationId}>
                          <Link
                            href={`/jobs/${m.jobPostId}`}
                            className="block rounded bg-blue-50 px-1 py-0.5 text-xs text-blue-800 hover:bg-blue-100"
                            title={regionDisplay ? `${m.title} · ${regionDisplay}` : m.title}
                          >
                            <span className="block truncate">{m.title}</span>
                            {regionDisplay && (
                              <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                {regionDisplay}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <li className="text-xs text-slate-500">+{dayEvents.length - 2}건</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
