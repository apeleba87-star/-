"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { glassCard } from "@/lib/ui-styles";

/** 달력 표기용: 모집중 | 모집 완료(포지션 다 채움) | 마감(글 전체 마감) */
export type ManageCalendarDisplayStatus = "recruiting" | "recruitment_completed" | "closed";

export type ManageCalendarItem = {
  id: string;
  title: string;
  work_date: string | null;
  status: string;
  applicationCount: number;
  region: string;
  district: string | null;
  /** 달력 색상·범례용 (모집중 / 모집 완료 / 마감) */
  displayStatus: ManageCalendarDisplayStatus;
};

type ViewMode = "list" | "calendar" | "applicants";

type Props = {
  calendarItems: ManageCalendarItem[];
  listView: React.ReactNode;
  applicantsView?: React.ReactNode;
};

export default function ManageView({ calendarItems, listView, applicantsView }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <div className="mt-6">
      <nav className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1" aria-label="보기 전환">
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
        {applicantsView != null && (
          <button
            type="button"
            onClick={() => setViewMode("applicants")}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              viewMode === "applicants" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            전체 지원자
          </button>
        )}
      </nav>

      {viewMode === "list" && listView}

      {viewMode === "calendar" && <ManageCalendar items={calendarItems} />}

      {viewMode === "applicants" && applicantsView}
    </div>
  );
}

function ManageCalendar({ items }: { items: ManageCalendarItem[] }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const todayStr = useMemo(() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  }, []);

  const { firstDay, daysInMonth, monthLabel, isCurrentMonth } = useMemo(() => {
    const y = current.year;
    const m = current.month;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstDay = first.getDay();
    const daysInMonth = last.getDate();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m;
    const monthLabel = `${y}년 ${m + 1}월`;
    return { firstDay, daysInMonth, monthLabel, isCurrentMonth };
  }, [current.year, current.month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ManageCalendarItem[]>();
    for (const item of items) {
      if (!item.work_date) continue;
      const list = map.get(item.work_date) ?? [];
      list.push(item);
      map.set(item.work_date, list);
    }
    return map;
  }, [items]);

  const goPrev = () => {
    setCurrent((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  };
  const goNext = () => {
    setCurrent((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  };
  const goToday = () => {
    const d = new Date();
    setCurrent({ year: d.getFullYear(), month: d.getMonth() });
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const leadingBlanks = firstDay;
  const totalCells = leadingBlanks + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <div className={`${glassCard} overflow-hidden p-4`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="이전 달"
        >
          ←
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-slate-900">{monthLabel}</span>
          {isCurrentMonth && (
            <span className="text-xs font-medium text-blue-600">이번 달</span>
          )}
        </div>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="다음 달"
        >
          →
        </button>
      </div>

      <div className="mb-2 flex justify-center">
        <button
          type="button"
          onClick={goToday}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
        >
          오늘
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
          const dayEvents = dateStr ? eventsByDate.get(dateStr) ?? [] : [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 ${
                !isInMonth
                  ? "bg-slate-50/80"
                  : isToday
                  ? "bg-blue-50/80 ring-2 ring-inset ring-blue-400"
                  : "bg-white"
              }`}
            >
              {isInMonth && (
                <>
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className={`text-sm font-medium ${
                        isToday ? "rounded-full bg-blue-500 px-1.5 py-0.5 text-white" : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-blue-600">오늘</span>
                    )}
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/jobs/${post.id}`}
                          className={`block truncate rounded px-1 py-0.5 text-xs hover:opacity-90 ${
                            post.displayStatus === "closed"
                              ? "bg-slate-200 text-slate-600"
                              : post.displayStatus === "recruitment_completed"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                          title={`${post.title} · ${[post.region, post.district].filter(Boolean).join(" ")}${post.applicationCount > 0 ? ` · 지원 ${post.applicationCount}명` : ""}`}
                        >
                          <span className="block truncate">{post.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                            {[post.region, post.district].filter(Boolean).join(" ")}
                          </span>
                          {post.applicationCount > 0 && (
                            <span className="block text-[10px] text-slate-500">
                              지원 {post.applicationCount}명
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
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

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-100" /> 모집중
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-blue-100" /> 모집 완료
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-slate-200" /> 마감
        </span>
      </div>
    </div>
  );
}
