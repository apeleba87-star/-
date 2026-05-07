"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS_KO, getWeekStartIso, parseIsoDate, toIsoDate } from "@/lib/cleanidex/week";

type SiteSummary = {
  site_id: string;
  site_name: string;
  client_id: string;
  client_name: string | null;
  rule:
    | {
        cadence: "weekly_count" | "weekday";
        weekly_count: number | null;
        weekdays: number[] | null;
        effective_from: string | null;
      }
    | null;
  expected_count: number;
  expected_dates: string[] | null;
  completed_count: number;
  completed_dates: string[];
  in_progress_dates: string[];
  added_dates: string[];
  skipped_dates: string[];
  rate: number;
  has_no_rule: boolean;
};

type Props = {
  isDark: boolean;
  baseCard: string;
  baseInput: string;
  onError: (msg: string | null) => void;
};

function shiftWeek(weekStartIso: string, deltaWeeks: number): string {
  const d = parseIsoDate(weekStartIso);
  const moved = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7 * deltaWeeks));
  return toIsoDate(moved);
}

function formatRule(rule: SiteSummary["rule"]): string {
  if (!rule) return "룰 미설정";
  if (rule.cadence === "weekly_count" && rule.weekly_count !== null) return `주 ${rule.weekly_count}회`;
  if (rule.cadence === "weekday" && rule.weekdays && rule.weekdays.length > 0) {
    return rule.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => `매주 ${WEEKDAY_LABELS_KO[d]}`)
      .join(", ");
  }
  return "-";
}

export default function WeeklySummaryView({ isDark, baseCard, baseInput, onError }: Props) {
  const [weekStart, setWeekStart] = useState(() => getWeekStartIso(new Date()));
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (ws: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cleanidex/weekly-summary?week_start=${ws}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "weekly_load_failed");
        setSites((json.sites ?? []) as SiteSummary[]);
        setWeekDays((json.week_days ?? []) as string[]);
      } catch (e) {
        onError(e instanceof Error ? e.message : "주간 현황을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const dimBox = isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50";

  const totals = useMemo(() => {
    const expected = sites.reduce((acc, s) => acc + s.expected_count, 0);
    const completed = sites.reduce((acc, s) => acc + s.completed_count, 0);
    return { expected, completed, rate: expected === 0 ? 0 : Math.min(1, completed / expected) };
  }, [sites]);

  const isThisWeek = weekStart === getWeekStartIso(new Date());

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${baseCard}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">주간 현황</h2>
            <p className={`mt-0.5 text-xs ${subText}`}>월요일 시작. 룰·이번 주 변경·완료 세션을 종합한 결과입니다.</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
              className={`rounded px-2 py-1 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
            >
              ‹ 이전 주
            </button>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(getWeekStartIso(parseIsoDate(e.target.value)))}
              className={`rounded border px-2 py-1 text-xs ${baseInput}`}
            />
            <button
              type="button"
              onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
              className={`rounded px-2 py-1 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
            >
              다음 주 ›
            </button>
            {!isThisWeek ? (
              <button
                type="button"
                onClick={() => setWeekStart(getWeekStartIso(new Date()))}
                className={`rounded px-2 py-1 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
              >
                이번 주
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className={`rounded border p-2 text-xs ${dimBox}`}>
            주 시작 (월): <span className="font-semibold">{weekStart}</span>
          </div>
          <div className={`rounded border p-2 text-xs ${dimBox}`}>
            전체 기대 <span className="font-semibold">{totals.expected}</span> · 완료{" "}
            <span className="font-semibold">{totals.completed}</span> · 진행률{" "}
            <span className="font-semibold">{Math.round(totals.rate * 100)}%</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${baseCard}`}>
        {loading ? (
          <p className={`text-sm ${subText}`}>불러오는 중…</p>
        ) : sites.length === 0 ? (
          <p className={`text-sm ${subText}`}>등록된 현장이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {sites.map((s) => {
              const ratePct = Math.round(s.rate * 100);
              const status =
                s.has_no_rule
                  ? "no_rule"
                  : s.expected_count === 0
                    ? "no_expected"
                    : s.completed_count >= s.expected_count
                      ? "done"
                      : s.completed_count > 0
                        ? "partial"
                        : "missing";
              return (
                <div key={s.site_id} className={`rounded-lg border p-3 ${dimBox}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {s.client_name ? `${s.client_name} · ` : ""}
                        {s.site_name}
                      </h3>
                      <p className={`text-xs ${subText}`}>{formatRule(s.rule)}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        status === "done"
                          ? "bg-emerald-100 text-emerald-700"
                          : status === "partial"
                            ? isDark
                              ? "bg-amber-900 text-amber-200"
                              : "bg-amber-100 text-amber-700"
                            : status === "missing"
                              ? isDark
                                ? "bg-rose-900 text-rose-200"
                                : "bg-rose-100 text-rose-700"
                              : isDark
                                ? "bg-slate-700 text-slate-200"
                                : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {status === "done"
                        ? "완료"
                        : status === "partial"
                          ? "진행 중"
                          : status === "missing"
                            ? "미완료"
                            : status === "no_rule"
                              ? "룰 미설정"
                              : "기대 0"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className={`relative h-2 flex-1 overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div
                        className={`absolute inset-y-0 left-0 ${
                          status === "done" ? "bg-emerald-500" : status === "partial" ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, ratePct))}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {s.completed_count} / {s.expected_count} ({ratePct}%)
                    </span>
                  </div>

                  {/* 요일 그리드 */}
                  <div className="mt-2 grid grid-cols-7 gap-1 text-[10px]">
                    {weekDays.map((d) => {
                      const isCompleted = s.completed_dates.includes(d);
                      const isInProgress = s.in_progress_dates.includes(d);
                      const isExpected =
                        Array.isArray(s.expected_dates) && s.expected_dates.includes(d);
                      const isAdded = s.added_dates.includes(d);
                      const isSkipped = s.skipped_dates.includes(d);
                      const dow = WEEKDAY_LABELS_KO[parseIsoDate(d).getUTCDay()];

                      let cls = isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50";
                      let label = "";
                      if (isCompleted) {
                        cls = "border-emerald-500 bg-emerald-100 text-emerald-800";
                        label = "✓";
                      } else if (isInProgress) {
                        cls = "border-amber-500 bg-amber-100 text-amber-800";
                        label = "·";
                      } else if (isSkipped) {
                        cls = "border-rose-300 bg-rose-50 text-rose-700 line-through";
                        label = "스킵";
                      } else if (isAdded) {
                        cls = "border-indigo-400 bg-indigo-50 text-indigo-700";
                        label = "추가";
                      } else if (isExpected) {
                        cls = "border-slate-400 bg-white text-slate-700";
                        label = "예정";
                      }

                      return (
                        <div
                          key={d}
                          className={`rounded border p-1 text-center ${cls}`}
                          title={`${d} ${dow}요일`}
                        >
                          <div className="font-semibold">{d.slice(5)}</div>
                          <div>
                            {dow}
                            {label ? ` ${label}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
