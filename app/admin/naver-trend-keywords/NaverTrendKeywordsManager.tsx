"use client";

import { useState, useTransition } from "react";
import {
  addNaverTrendKeywordGroup,
  deleteNaverTrendKeywordGroup,
  runNaverTrendReportManual,
  updateNaverTrendKeywordGroup,
} from "./actions";

export type KeywordGroupRow = {
  id: string;
  group_name: string;
  keywords: string[];
  sort_order: number;
  is_active: boolean;
};

type Props = { initialRows: KeywordGroupRow[] };

export default function NaverTrendKeywordsManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-800">리포트 수동 갱신</h2>
        <p className="mt-1 text-xs text-slate-600">
          서버 환경에 <code className="rounded bg-white px-1">NAVER_CLIENT_ID</code> /{" "}
          <code className="rounded bg-white px-1">NAVER_CLIENT_SECRET</code> 가 있어야 합니다. Cron:{" "}
          <code className="rounded bg-white px-1">POST /api/cron/naver-trend-report</code> +{" "}
          <code className="rounded bg-white px-1">x-cron-secret</code>
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              const r = await runNaverTrendReportManual();
              if (r.ok) {
                setMsg(`완료: ${r.report_date ?? ""} (그룹 ${r.groups_fetched ?? 0}개)`);
              } else {
                setMsg(r.error ?? "실패");
              }
            });
          }}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          지금 데이터랩 조회·리포트 저장
        </button>
        {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">키워드 그룹 추가</h2>
        <p className="mb-3 text-xs text-slate-500">
          데이터랩 API는 요청당 최대 5개 그룹입니다. 그룹이 많으면 자동으로 나눠 호출합니다. 그룹당 키워드 최대 20개(쉼표·줄바꿈 구분).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[160px]">
            <span className="text-xs font-medium text-slate-600">주제어(그룹명)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="예: 입주청소"
            />
          </label>
          <label className="block min-w-[200px]">
            <span className="text-xs font-medium text-slate-600">순서</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block min-w-[280px] flex-1">
            <span className="text-xs font-medium text-slate-600">키워드</span>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="입주청소, 입주 청소 비용"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMsg(null);
              startTransition(async () => {
                const r = await addNaverTrendKeywordGroup(name, keywords, sortOrder);
                if (!r.ok) {
                  setMsg(r.error ?? "추가 실패");
                  return;
                }
                if (r.row) setRows((prev) => [...prev, r.row as KeywordGroupRow].sort((a, b) => a.sort_order - b.sort_order));
                setName("");
                setKeywords("");
                setMsg("추가했습니다.");
              });
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">등록된 그룹</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-semibold text-slate-700">순서</th>
                <th className="px-3 py-2 font-semibold text-slate-700">주제어</th>
                <th className="px-3 py-2 font-semibold text-slate-700">키워드</th>
                <th className="px-3 py-2 font-semibold text-slate-700">활성</th>
                <th className="px-3 py-2 font-semibold text-slate-700">동작</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    그룹이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <GroupRowEditor key={row.id} row={row} onChange={setRows} pending={pending} startTransition={startTransition} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function GroupRowEditor({
  row,
  onChange,
  pending,
  startTransition,
}: {
  row: KeywordGroupRow;
  onChange: React.Dispatch<React.SetStateAction<KeywordGroupRow[]>>;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [sortOrder, setSortOrder] = useState(row.sort_order);
  const [active, setActive] = useState(row.is_active);
  const [kwText, setKwText] = useState(row.keywords.join(", "));

  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2">
        <input
          type="number"
          className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          onBlur={() => {
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { sort_order: sortOrder });
              onChange((prev) =>
                prev.map((r) => (r.id === row.id ? { ...r, sort_order: sortOrder } : r)).sort((a, b) => a.sort_order - b.sort_order)
              );
            });
          }}
        />
      </td>
      <td className="px-3 py-2 font-medium text-slate-800">{row.group_name}</td>
      <td className="max-w-md px-3 py-2">
        <textarea
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
          rows={2}
          value={kwText}
          onChange={(e) => setKwText(e.target.value)}
          onBlur={() => {
            const parts = kwText
              .split(/[,，\n]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (parts.length < 1 || parts.length > 20) return;
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { keywords: parts });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, keywords: parts } : r)));
            });
          }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={active}
          onChange={() => {
            const next = !active;
            setActive(next);
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { is_active: next });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
            });
          }}
          disabled={pending}
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            if (!confirm("삭제할까요?")) return;
            startTransition(async () => {
              const r = await deleteNaverTrendKeywordGroup(row.id);
              if (r.ok) onChange((prev) => prev.filter((x) => x.id !== row.id));
            });
          }}
        >
          삭제
        </button>
      </td>
    </tr>
  );
}
