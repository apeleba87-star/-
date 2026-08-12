"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { EquipmentCategoryId } from "@/lib/knowledge-hub/equipment/types";

export type EquipmentCardData = {
  id: string;
  name: string;
  categoryId: EquipmentCategoryId;
  categoryName: string;
  summary: string;
  placeHints?: string[];
  jobHints?: string[];
  imageUrl?: string | null;
  modelCount?: number;
};

type CategoryTab = {
  id: EquipmentCategoryId | "";
  name: string;
  blurb?: string;
};

type Props = {
  items: EquipmentCardData[];
  categories: CategoryTab[];
};

function useChips(item: EquipmentCardData): string[] {
  const raw = [...(item.placeHints ?? []), ...(item.jobHints ?? [])];
  return raw
    .map((s) => s.trim())
    .filter((t) => {
      if (!t) return false;
      if (t.length > 18) return false;
      return true;
    })
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 4);
}

function EquipmentCard({ item }: { item: EquipmentCardData }) {
  const chips = useChips(item);
  return (
    <Link
      href={`/equipment/${item.id}`}
      className="block overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-sm transition hover:border-emerald-800/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            {item.categoryName}
          </span>
          <span className="mt-1 block break-keep text-xl font-black leading-snug tracking-tight text-slate-950">
            {item.name}
          </span>
        </div>
      </div>

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

      <div className="border-t-2 border-slate-200 bg-slate-100/80 px-5 py-4">
        <p className="text-sm font-bold text-slate-500">한 줄 요약</p>
        <p className="mt-1 break-keep text-2xl font-black tracking-tight leading-snug text-slate-950 line-clamp-2">
          {item.summary}
        </p>
        {item.modelCount && item.modelCount > 0 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-800">브랜드·기종 {item.modelCount}개</p>
        ) : null}
      </div>
    </Link>
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

export default function EquipmentCatalog({ items, categories }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<EquipmentCategoryId | "">("");

  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  const listed = useMemo(() => {
    let rows = items;
    if (cat) rows = rows.filter((i) => i.categoryId === cat);
    if (query) {
      rows = rows.filter((i) => {
        const hay = [i.name, i.summary, i.categoryName, ...(i.placeHints ?? []), ...(i.jobHints ?? [])]
          .join(" ")
          .toLowerCase()
          .replace(/\s+/g, "");
        return hay.includes(query);
      });
    }
    return rows;
  }, [items, cat, query]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">청소장비</h1>

      <form className="mt-5" onSubmit={onSearchSubmit} role="search">
        <label htmlFor="equipment-search" className="sr-only">
          장비 검색
        </label>
        <input
          id="equipment-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="장비명 · 용도 · 작업으로 검색"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-800/30"
        />
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <FilterBtn key={c.id || "all"} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </FilterBtn>
        ))}
      </div>

      <p className="mt-5 text-base text-slate-500">{listed.length}개 장비</p>

      {listed.length === 0 ? (
        <p className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-base text-slate-500">
          조건에 맞는 장비가 없습니다.
        </p>
      ) : (
        <ul className="mt-3 grid gap-4">
          {listed.map((item) => (
            <li key={item.id}>
              <EquipmentCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
