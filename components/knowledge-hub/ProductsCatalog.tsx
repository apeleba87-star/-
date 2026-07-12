"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { dilutionSortKey } from "@/lib/knowledge-hub/dilution-label";
import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";

type SortKey = "ph" | "name" | "dilution";

export type ProductCardData = Pick<
  KnowledgeProduct,
  | "id"
  | "name"
  | "brand"
  | "status"
  | "standardDilution"
  | "phApprox"
  | "contaminantsRaw"
  | "mainUse"
  | "compatibleMaterialIds"
  | "contaminantIds"
  | "aliases"
>;

type FilterOption = { id: string; name: string };

type Props = {
  products: ProductCardData[];
  materials: FilterOption[];
  contaminants: FilterOption[];
  /** 서버에서 listProductsForMaterial 로 미리 계산 — 클라이언트에 지식 DB 미포함 */
  productIdsByMaterial: Record<string, string[]>;
};

function filterByProblem(
  products: ProductCardData[],
  materialId: string,
  contaminantId: string,
  productIdsByMaterial: Record<string, string[]>
): ProductCardData[] {
  const allowed = materialId ? new Set(productIdsByMaterial[materialId] ?? []) : null;
  return products.filter((p) => {
    if (allowed && !allowed.has(p.id)) return false;
    if (contaminantId && !(p.contaminantIds ?? []).includes(contaminantId)) return false;
    return true;
  });
}

function useChips(p: ProductCardData): string[] {
  const raw = p.contaminantsRaw?.length ? p.contaminantsRaw : p.mainUse;
  return raw
    .map((s) => s.trim())
    .filter((t) => {
      if (!t) return false;
      if (/^\(※|^※/.test(t)) return false;
      if (t.length > 18) return false;
      return true;
    })
    .slice(0, 4);
}

function matchesQuery(p: ProductCardData, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/\s+/g, "");
  const hay = [
    p.name,
    p.brand,
    ...(p.aliases ?? []),
    ...(p.contaminantsRaw ?? []),
    ...p.mainUse,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
  return hay.includes(needle);
}

function ProductCard({ p, dimmed, highlight }: { p: ProductCardData; dimmed?: boolean; highlight?: boolean }) {
  const chips = useChips(p);
  return (
    <Link
      href={`/products/${p.id}`}
      data-product-id={p.id}
      className={`block overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition ${
        highlight
          ? "border-emerald-700 ring-2 ring-emerald-700/25"
          : "border-slate-300 hover:border-emerald-800/40 hover:shadow-md"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            {p.brand}
          </span>
          <span className="mt-1 block break-keep text-xl font-black leading-snug tracking-tight text-slate-950">
            {p.name}
          </span>
        </div>
        <ProductPhBadge phApprox={p.phApprox} size="md" className="mt-0.5" />
      </div>

      {/* 용도 — 이름 바로 아래, 가장 잘 보이게 */}
      {chips.length ? (
        <div className="border-t-2 border-slate-200 bg-emerald-50 px-5 py-4">
          <p className="text-base font-bold text-emerald-900">용도</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li
                key={c}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-base font-bold text-slate-900"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {p.standardDilution ? (
        <div className="border-t-2 border-slate-200 bg-slate-100/80 px-5 py-4">
          <p className="text-sm font-bold text-slate-500">희석비율</p>
          <p className="mt-1 break-keep text-2xl font-black tracking-tight text-slate-950">
            {p.standardDilution}
          </p>
        </div>
      ) : null}

      {p.status === "draft" ? (
        <div className="border-t-2 border-slate-200 px-5 py-3">
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800">
            사례만
          </span>
        </div>
      ) : null}
    </Link>
  );
}

/**
 * 첫 화면 목록을 유지한 채 검색한다.
 * 카드를 지우지 않고, 일치 항목을 위로·강조하고 나머지는 흐리게만 한다.
 */
function compareProducts(a: ProductCardData, b: ProductCardData, sort: SortKey): number {
  const ad = a.status === "draft" ? 1 : 0;
  const bd = b.status === "draft" ? 1 : 0;
  if (ad !== bd) return ad - bd;

  if (sort === "ph") {
    const pa = parseProductPh(a.phApprox)?.value ?? Number.POSITIVE_INFINITY;
    const pb = parseProductPh(b.phApprox)?.value ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
  } else if (sort === "dilution") {
    const da = dilutionSortKey(a.standardDilution);
    const db = dilutionSortKey(b.standardDilution);
    if (da !== db) return da - db;
  }

  return a.name.localeCompare(b.name, "ko");
}

export default function ProductsCatalog({
  products,
  materials,
  contaminants,
  productIdsByMaterial,
}: Props) {
  const searchParams = useSearchParams();
  const initialMaterial = searchParams.get("material") ?? "";
  const initialContaminant = searchParams.get("contaminant") ?? "";

  const [q, setQ] = useState("");
  const [materialId, setMaterialId] = useState(initialMaterial);
  const [contaminantId, setContaminantId] = useState(initialContaminant);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(initialMaterial || initialContaminant));
  const [sort, setSort] = useState<SortKey>("name");
  const listRef = useRef<HTMLUListElement>(null);

  const baseList = useMemo(() => {
    const list = filterByProblem(products, materialId, contaminantId, productIdsByMaterial);
    return [...list].sort((a, b) => compareProducts(a, b, sort));
  }, [products, materialId, contaminantId, productIdsByMaterial, sort]);

  const query = q.trim();
  const matchIds = useMemo(() => {
    if (!query) return null;
    return new Set(baseList.filter((p) => matchesQuery(p, query)).map((p) => p.id));
  }, [baseList, query]);

  const displayList = useMemo(() => {
    if (!matchIds) return baseList;
    const hit = baseList.filter((p) => matchIds.has(p.id));
    const rest = baseList.filter((p) => !matchIds.has(p.id));
    return [...hit, ...rest];
  }, [baseList, matchIds]);

  const matchCount = matchIds ? matchIds.size : baseList.length;

  useEffect(() => {
    if (!matchIds || matchIds.size === 0) return;
    const firstId = displayList.find((p) => matchIds.has(p.id))?.id;
    if (!firstId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-product-id="${firstId}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [query, matchIds, displayList]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">세정 제품</h1>

      <form className="mt-5" onSubmit={onSearchSubmit} role="search">
        <label htmlFor="product-search" className="sr-only">
          제품 검색
        </label>
        <input
          id="product-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제품명 · 용도 · 오염으로 검색"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-800/30"
        />
      </form>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="text-base font-medium text-slate-600 underline-offset-2 hover:text-emerald-900 hover:underline"
        >
          {filtersOpen ? "재질·오염 필터 닫기" : "재질·오염으로 좁히기"}
        </button>
        {filtersOpen ? (
          <div className="mt-3 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-400">재질</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterBtn active={!materialId} onClick={() => setMaterialId("")}>
                  전체
                </FilterBtn>
                {materials.map((m) => (
                  <FilterBtn
                    key={m.id}
                    active={materialId === m.id}
                    onClick={() => setMaterialId(m.id === materialId ? "" : m.id)}
                  >
                    {m.name}
                  </FilterBtn>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400">오염</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterBtn active={!contaminantId} onClick={() => setContaminantId("")}>
                  전체
                </FilterBtn>
                {contaminants.map((c) => (
                  <FilterBtn
                    key={c.id}
                    active={contaminantId === c.id}
                    onClick={() => setContaminantId(c.id === contaminantId ? "" : c.id)}
                  >
                    {c.name}
                  </FilterBtn>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-slate-500">
          {query
            ? matchCount > 0
              ? `${baseList.length}개 중 ${matchCount}개 일치`
              : `${baseList.length}개 제품 · 일치 없음`
            : `${baseList.length}개 제품`}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="정렬">
          <FilterBtn active={sort === "ph"} onClick={() => setSort("ph")}>
            pH순
          </FilterBtn>
          <FilterBtn active={sort === "name"} onClick={() => setSort("name")}>
            제품명순
          </FilterBtn>
          <FilterBtn active={sort === "dilution"} onClick={() => setSort("dilution")}>
            희석비율순
          </FilterBtn>
        </div>
      </div>

      <ul ref={listRef} className="mt-3 grid gap-4">
        {displayList.map((p) => {
          const isHit = !matchIds || matchIds.has(p.id);
          return (
            <li key={p.id}>
              <ProductCard
                p={p}
                highlight={Boolean(query && isHit && matchCount > 0)}
                dimmed={Boolean(query && !isHit)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-base font-medium ${
        active
          ? "bg-emerald-800 text-white"
          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
