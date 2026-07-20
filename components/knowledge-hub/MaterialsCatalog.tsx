"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";
import {
  MATERIAL_GROUP_BLURB,
  MATERIAL_GROUP_LABEL,
  MATERIAL_GROUP_ORDER,
  getMaterialGroupId,
  type MaterialGroupId,
} from "@/lib/knowledge-hub/materials/groups";

export type MaterialCardData = {
  id: string;
  name: string;
  riskLevel: string;
  groupId?: MaterialGroupId;
};

type Props = {
  materials: MaterialCardData[];
};

type Step = "group" | "list";

function riskTextClass(risk: string): string {
  if (risk === "low") return "text-emerald-700";
  if (risk === "medium") return "text-amber-700";
  if (risk === "high") return "text-orange-700";
  if (risk === "very_high") return "text-rose-700";
  return "text-slate-500";
}

const RISK_FILTERS = [
  { id: "", label: "전체" },
  { id: "low", label: "낮음" },
  { id: "medium", label: "보통" },
  { id: "high", label: "높음" },
  { id: "very_high", label: "매우 높음" },
] as const;

export default function MaterialsCatalog({ materials }: Props) {
  const [q, setQ] = useState("");
  const [groupId, setGroupId] = useState<MaterialGroupId | "">("");
  const [risk, setRisk] = useState("");

  const withGroup = useMemo(
    () =>
      materials.map((m) => ({
        ...m,
        groupId: m.groupId ?? getMaterialGroupId(m.id),
      })),
    [materials]
  );

  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  const searchHits = useMemo(() => {
    if (!query) return [];
    return withGroup.filter((m) => {
      const hay = [m.name, MATERIAL_GROUP_LABEL[m.groupId]].join(" ").toLowerCase().replace(/\s+/g, "");
      return hay.includes(query);
    });
  }, [withGroup, query]);

  const groups = useMemo(() => {
    const count = new Map<MaterialGroupId, number>();
    for (const m of withGroup) count.set(m.groupId, (count.get(m.groupId) ?? 0) + 1);
    return MATERIAL_GROUP_ORDER.filter((id) => (count.get(id) ?? 0) > 0).map((id) => ({
      id,
      label: MATERIAL_GROUP_LABEL[id],
      blurb: MATERIAL_GROUP_BLURB[id],
      n: count.get(id) ?? 0,
    }));
  }, [withGroup]);

  const listed = useMemo(() => {
    let rows = withGroup;
    if (groupId) rows = rows.filter((m) => m.groupId === groupId);
    if (risk) rows = rows.filter((m) => m.riskLevel === risk);
    return rows;
  }, [withGroup, groupId, risk]);

  const step: Step = !groupId ? "group" : "list";
  const searching = Boolean(query);
  const groupLabel = groupId ? MATERIAL_GROUP_LABEL[groupId] : "";

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">재질별 청소</h1>
      <p className="mt-2 text-base text-slate-600">
        표면을 다치지 않게 — 금기·권장·일상 관리를 고르세요. 오염 제거는 「오염으로 찾기」를 이용하세요.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        세제·제거 처방이 필요하면{" "}
        <Link href="/pollution" className="font-bold text-teal-800 hover:underline">
          오염으로 찾기
        </Link>
        {" · "}
        루틴·걸레질은{" "}
        <Link href="/places" className="font-bold text-teal-800 hover:underline">
          장소별
        </Link>
        로 이동하세요.
      </p>

      <div className="relative mt-6">
        <label htmlFor="material-search" className="sr-only">
          재질 검색
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="material-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="예: 대리석, 스테인레스, 유리"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/25"
        />
      </div>

      {searching ? (
        <div className="mt-6">
          <p className="text-sm text-slate-500">{searchHits.length}건 일치</p>
          <ul className="mt-3 space-y-2">
            {searchHits.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/materials/${m.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-teal-300"
                >
                  <span className="block text-base font-black text-slate-950">{m.name}</span>
                  <span className={`mt-1 block text-sm font-bold ${riskTextClass(m.riskLevel)}`}>
                    {MATERIAL_GROUP_LABEL[m.groupId]} · 위험도 {RISK_LEVEL_KO[m.riskLevel] ?? m.riskLevel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!searchHits.length ? (
            <p className="mt-6 text-center text-slate-500">검색 결과가 없습니다.</p>
          ) : null}
        </div>
      ) : (
        <>
          {step === "list" ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGroupId("");
                  setRisk("");
                }}
                className="inline-flex items-center gap-1 text-sm font-bold text-teal-800"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                재질군
              </button>
              <span className="text-sm font-bold text-slate-500">{groupLabel}</span>
            </div>
          ) : null}

          {step === "list" ? (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="위험도 필터">
              {RISK_FILTERS.map((f) => {
                const active = risk === f.id;
                return (
                  <button
                    key={f.id || "all"}
                    type="button"
                    onClick={() => setRisk(f.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-teal-300"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === "group" ? (
            <ul className="mt-6 space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setGroupId(g.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-teal-300 active:bg-teal-50/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-black text-slate-950">{g.label}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{g.blurb}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-slate-500">{g.n}개</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-6 space-y-2">
              {listed.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/materials/${m.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-teal-300 active:bg-teal-50/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-black text-slate-950">{m.name}</span>
                      <span className={`mt-1 block text-sm font-bold ${riskTextClass(m.riskLevel)}`}>
                        위험도 {RISK_LEVEL_KO[m.riskLevel] ?? m.riskLevel}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {step === "list" && !listed.length ? (
            <p className="mt-6 text-center text-slate-500">해당 위험도의 재질이 없습니다.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
