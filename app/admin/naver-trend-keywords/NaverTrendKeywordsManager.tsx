"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addNaverTrendKeywordGroup,
  deleteNaverTrendKeywordGroup,
  runNaverTrendReportManual,
  updateNaverTrendKeywordGroup,
} from "./actions";
import NaverTrendExcelUpload from "./NaverTrendExcelUpload";

export type KeywordGroupRow = {
  id: string;
  group_name: string;
  keywords: string[];
  sub_keywords: string[];
  size_keywords: string[];
  title_templates: string[];
  sort_order: number;
  is_active: boolean;
};

type Props = { initialRows: KeywordGroupRow[] };

export default function NaverTrendKeywordsManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mainKeyword, setMainKeyword] = useState("");
  const [subs, setSubs] = useState("");
  const [sizes, setSizes] = useState("");
  const [templates, setTemplates] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-800">리포트 수동 갱신</h2>
        <p className="mt-1 text-xs text-slate-600">
          서버 환경에 <code className="rounded bg-white px-1">NAVER_CLIENT_ID</code> /{" "}
          <code className="rounded bg-white px-1">NAVER_CLIENT_SECRET</code> 가 있어야 합니다.           Vercel Cron: 매일 <strong>한국시간 03:00</strong>(UTC 18:00){" "}
          <code className="rounded bg-white px-1">GET/POST /api/cron/naver-trend-report</code> +{" "}
          <code className="rounded bg-white px-1">Bearer CRON_SECRET</code> 또는{" "}
          <code className="rounded bg-white px-1">x-cron-secret</code>. 리포트는 KST 기준 전일까지
          집계입니다.
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

      <NaverTrendExcelUpload
        pending={pending}
        startTransition={startTransition}
        setMsg={setMsg}
        onImported={(imported) => {
          setRows((prev) => [...prev, ...imported].sort((a, b) => a.sort_order - b.sort_order));
        }}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">키워드 그룹 추가</h2>
        <p className="mb-3 text-xs text-slate-500">
          데이터랩에는 그룹당 <strong>메인 키워드 1개</strong>만 전송합니다. 파생 제목은 선정 1~3위마다 <strong>해당 그룹에 등록된 템플릿</strong>에서 2개씩 뽑으며, 같은 날 리포트 안에서 템플릿 줄·특정 반복 문구가 키워드끼리 겹치지 않게 조정합니다. 템플릿에{" "}
          <code className="rounded bg-white px-1">{`{메인}`}</code>, <code className="rounded bg-white px-1">{`{서브}`}</code>,{" "}
          <code className="rounded bg-white px-1">{`{크기}`}</code>, <code className="rounded bg-white px-1">{`{지역}`}</code> 를 쓸 수 있습니다.
        </p>
        <div className="flex flex-col gap-3">
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
            <label className="block min-w-[180px]">
              <span className="text-xs font-medium text-slate-600">메인 키워드 (데이터랩)</span>
              <input
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="비우면 주제어와 동일"
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
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMsg(null);
                startTransition(async () => {
                  const r = await addNaverTrendKeywordGroup(name, mainKeyword, subs, sizes, templates, sortOrder);
                  if (!r.ok) {
                    setMsg(r.error ?? "추가 실패");
                    return;
                  }
                  if (r.row) setRows((prev) => [...prev, r.row as KeywordGroupRow].sort((a, b) => a.sort_order - b.sort_order));
                  setName("");
                  setMainKeyword("");
                  setSubs("");
                  setSizes("");
                  setTemplates("");
                  setMsg("추가했습니다.");
                });
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:self-end"
            >
              추가
            </button>
          </div>
          <label className="block max-w-3xl">
            <span className="text-xs font-medium text-slate-600">서브 키워드 (쉼표로 구분, 줄바꿈·세미콜론도 가능)</span>
            <textarea
              value={subs}
              onChange={(e) => setSubs(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="비용, 후기"
            />
          </label>
          <label className="block max-w-3xl">
            <span className="text-xs font-medium text-slate-600">크기·유형 (쉼표로 구분 — 예: 10평, 11평, 원룸, 투룸)</span>
            <textarea
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="10평, 11평, 원룸, 투룸"
            />
          </label>
          <label className="block max-w-3xl">
            <span className="text-xs font-medium text-slate-600">제목 템플릿 (한 줄에 하나)</span>
            <textarea
              value={templates}
              onChange={(e) => setTemplates(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-xs"
              placeholder="{지역} {크기} {메인} {서브} 정리"
            />
          </label>
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
                <th className="px-3 py-2 font-semibold text-slate-700">메인</th>
                <th className="px-3 py-2 font-semibold text-slate-700">서브·템플릿</th>
                <th className="px-3 py-2 font-semibold text-slate-700">활성</th>
                <th className="px-3 py-2 font-semibold text-slate-700">동작</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
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
  const [groupName, setGroupName] = useState(row.group_name);
  const [mainKw, setMainKw] = useState(row.keywords[0] ?? "");
  const [subsText, setSubsText] = useState((row.sub_keywords ?? []).join("\n"));
  const [sizesText, setSizesText] = useState((row.size_keywords ?? []).join("\n"));
  const [tplText, setTplText] = useState((row.title_templates ?? []).join("\n"));

  useEffect(() => {
    setSortOrder(row.sort_order);
    setActive(row.is_active);
    setGroupName(row.group_name);
    setMainKw(row.keywords[0] ?? "");
    setSubsText((row.sub_keywords ?? []).join("\n"));
    setSizesText((row.size_keywords ?? []).join("\n"));
    setTplText((row.title_templates ?? []).join("\n"));
  }, [
    row.id,
    row.group_name,
    row.sort_order,
    row.is_active,
    row.keywords[0],
    (row.sub_keywords ?? []).join("\u0001"),
    (row.size_keywords ?? []).join("\u0001"),
    (row.title_templates ?? []).join("\u0001"),
  ]);

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
      <td className="max-w-[140px] px-3 py-2">
        <input
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onBlur={() => {
            const next = groupName.trim();
            if (!next || next === row.group_name) return;
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { group_name: next });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, group_name: next } : r)));
            });
          }}
        />
      </td>
      <td className="max-w-[160px] px-3 py-2">
        <input
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
          value={mainKw}
          onChange={(e) => setMainKw(e.target.value)}
          onBlur={() => {
            const main = mainKw.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean)[0];
            if (!main) return;
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { keywords: [main] });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, keywords: [main] } : r)));
            });
          }}
        />
      </td>
      <td className="max-w-xl px-3 py-2">
        <p className="mb-1 text-[10px] font-medium text-slate-500">서브</p>
        <textarea
          className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
          rows={2}
          value={subsText}
          onChange={(e) => setSubsText(e.target.value)}
          onBlur={() => {
            const sub_keywords = subsText.split(/[,，;；\n\r]+/).map((s) => s.trim()).filter(Boolean);
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { sub_keywords });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, sub_keywords } : r)));
            });
          }}
        />
        <p className="mb-1 text-[10px] font-medium text-slate-500">크기·유형</p>
        <textarea
          className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
          rows={2}
          value={sizesText}
          onChange={(e) => setSizesText(e.target.value)}
          onBlur={() => {
            const size_keywords = sizesText.split(/[,，;；\n\r]+/).map((s) => s.trim()).filter(Boolean);
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { size_keywords });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, size_keywords } : r)));
            });
          }}
        />
        <p className="mb-1 text-[10px] font-medium text-slate-500">템플릿(줄당 1개)</p>
        <textarea
          className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[11px]"
          rows={3}
          value={tplText}
          onChange={(e) => setTplText(e.target.value)}
          onBlur={() => {
            const title_templates = tplText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
            startTransition(async () => {
              await updateNaverTrendKeywordGroup(row.id, { title_templates });
              onChange((prev) => prev.map((r) => (r.id === row.id ? { ...r, title_templates } : r)));
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
