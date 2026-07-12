"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

/** 목록 카드용 — 상세 steps·warnings 등 제외 */
export type CaseCardData = {
  id: string;
  name?: string;
  categoryMajor: string;
  categoryMid?: string;
  categoryMinor?: string;
  facility?: string;
  area?: string;
  materialRaw?: string;
  contaminantRaw?: string;
  dilution?: string;
  productNames: string[];
  productIds?: string[];
  materialIds?: string[];
  contaminantIds?: string[];
};

type FilterOption = { id: string; name: string };

type Props = {
  cases: CaseCardData[];
  categories: string[];
  products: FilterOption[];
  materials: FilterOption[];
  contaminants: FilterOption[];
};

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/25";

function shortLine(s: string, max = 36): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function caseTitle(c: CaseCardData): string {
  const mat = c.materialRaw?.trim();
  const cont = c.contaminantRaw?.trim();
  if (mat && cont) return shortLine(`${mat} · ${cont}`, 56);
  if (mat) return shortLine(mat, 48);
  if (cont) return shortLine(cont, 48);
  if (c.name?.trim()) return shortLine(c.name, 48);
  return c.categoryMajor || "현장 사례";
}

function caseProductLine(c: CaseCardData): string | null {
  const product = c.productNames.length ? c.productNames.slice(0, 2).join(" · ") : null;
  if (c.dilution && product) return `${product} · 희석 ${c.dilution}`;
  if (c.dilution) return `희석 ${c.dilution}`;
  return product;
}

function caseMatchesQuery(c: CaseCardData, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/\s+/g, "");
  const hay = [
    c.name,
    c.categoryMajor,
    c.categoryMid,
    c.categoryMinor,
    c.facility,
    c.area,
    c.materialRaw,
    c.contaminantRaw,
    c.dilution,
    ...c.productNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  return hay.includes(needle);
}

export default function CasesCatalog({
  cases,
  categories,
  products,
  materials,
  contaminants,
}: Props) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState(searchParams.get("product") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [material, setMaterial] = useState(searchParams.get("material") ?? "");
  const [contaminant, setContaminant] = useState(searchParams.get("contaminant") ?? "");

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (product && !c.productIds?.includes(product)) return false;
      if (category && c.categoryMajor !== category) return false;
      if (material && !c.materialIds?.includes(material)) return false;
      if (contaminant && !c.contaminantIds?.includes(contaminant)) return false;
      if (q.trim() && !caseMatchesQuery(c, q.trim())) return false;
      return true;
    });
  }, [cases, product, category, material, contaminant, q]);

  const filterActive = Boolean(product || category || material || contaminant);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">사례</h1>
      <p className="mt-2 text-base text-slate-600">현장 기록입니다. 처방이 아닙니다.</p>

      <label htmlFor="case-search" className="sr-only">
        사례 검색
      </label>
      <input
        id="case-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="검색"
        autoComplete="off"
        enterKeyHint="search"
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/25"
      />

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-base font-bold text-teal-800 marker:content-none [&::-webkit-details-marker]:hidden">
          필터{filterActive ? " · 적용 중" : ""}
          <span className="ml-1 text-slate-400 transition group-open:hidden">▾</span>
          <span className="ml-1 hidden text-slate-400 group-open:inline">▴</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} aria-label="분류">
            <option value="">전체 분류</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select value={product} onChange={(e) => setProduct(e.target.value)} className={selectClass} aria-label="제품">
            <option value="">전체 제품</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={material} onChange={(e) => setMaterial(e.target.value)} className={selectClass} aria-label="재질">
            <option value="">전체 재질</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={contaminant}
            onChange={(e) => setContaminant(e.target.value)}
            className={selectClass}
            aria-label="오염"
          >
            <option value="">전체 오염</option>
            {contaminants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </details>

      <p className="mt-4 text-sm text-slate-500">{filtered.length}건</p>

      <ul className="mt-4 grid gap-3">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cases/${c.id}`}
              className="block rounded-2xl border border-slate-200 bg-white px-5 py-5 transition hover:border-teal-300 hover:shadow-sm sm:px-6 sm:py-6"
            >
              <p className="break-keep text-2xl font-black leading-snug text-slate-950 sm:text-3xl">
                {caseTitle(c)}
              </p>
              {caseProductLine(c) ? (
                <p className="mt-3 text-lg font-bold text-teal-800 sm:text-xl">{caseProductLine(c)}</p>
              ) : null}
              {c.categoryMajor ? (
                <p className="mt-2 text-base text-slate-500">{c.categoryMajor}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {!filtered.length ? (
        <p className="mt-8 text-center text-slate-500">조건에 맞는 사례가 없습니다.</p>
      ) : null}
    </div>
  );
}
