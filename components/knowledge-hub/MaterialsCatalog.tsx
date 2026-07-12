"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";

export type MaterialCardData = {
  id: string;
  name: string;
  riskLevel: string;
};

type Props = {
  materials: MaterialCardData[];
};

function riskTextClass(risk: string): string {
  if (risk === "low") return "text-emerald-700";
  if (risk === "medium") return "text-amber-700";
  if (risk === "high") return "text-orange-700";
  if (risk === "very_high") return "text-rose-700";
  return "text-slate-500";
}

export default function MaterialsCatalog({ materials }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!needle) return materials;
    return materials.filter((m) => m.name.toLowerCase().replace(/\s+/g, "").includes(needle));
  }, [materials, q]);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">재질별 청소</h1>
      <p className="mt-2 text-base text-slate-600">재질을 고르면 제품·레시피가 나옵니다.</p>

      <label htmlFor="material-search" className="sr-only">
        재질 검색
      </label>
      <input
        id="material-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="재질 검색"
        autoComplete="off"
        enterKeyHint="search"
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/25"
      />

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map((m) => (
          <li key={m.id}>
            <Link
              href={`/materials/${m.id}`}
              className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm transition hover:border-teal-300 hover:shadow-md active:bg-teal-50/40 sm:min-h-[128px] sm:px-7 sm:py-7"
            >
              <span className="break-keep text-2xl font-black leading-snug tracking-tight text-slate-950">
                {m.name}
              </span>
              <span className={`mt-4 text-base font-bold ${riskTextClass(m.riskLevel)}`}>
                위험도 {RISK_LEVEL_KO[m.riskLevel] ?? m.riskLevel}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!filtered.length ? (
        <p className="mt-6 text-center text-slate-500">검색 결과가 없습니다.</p>
      ) : null}
    </div>
  );
}
