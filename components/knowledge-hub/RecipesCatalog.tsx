"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type RecipeListItem = {
  slug: string;
  field: string;
  dilution: string;
  productId: string;
  productName: string;
  materialName: string;
  contaminantName: string;
};

type Props = {
  recipes: RecipeListItem[];
};

function shortName(name: string): string {
  return name.split("(")[0]!.trim();
}

export default function RecipesCatalog({ recipes }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!needle) return recipes;
    return recipes.filter((r) => {
      const hay = [r.productName, r.materialName, r.contaminantName, r.field, r.dilution]
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "");
      return hay.includes(needle);
    });
  }, [recipes, q]);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">세정 레시피</h1>
      <p className="mt-2 text-base text-slate-600">제품과 희석만 고르면 됩니다.</p>

      <label htmlFor="recipe-search" className="sr-only">
        레시피 검색
      </label>
      <input
        id="recipe-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="검색"
        autoComplete="off"
        enterKeyHint="search"
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/25"
      />

      <ul className="mt-6 grid gap-3">
        {filtered.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/cleaning/${r.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white px-5 py-5 transition hover:border-teal-300 hover:shadow-sm sm:px-6 sm:py-6"
            >
              <p className="break-keep text-2xl font-black leading-snug text-slate-950 sm:text-3xl">
                {r.productName}
              </p>
              <p className="mt-3 text-xl font-black text-teal-800 sm:text-2xl">희석 {r.dilution}</p>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                {shortName(r.materialName)} · {shortName(r.contaminantName)}
                {r.field ? ` · ${r.field}` : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {!filtered.length ? (
        <p className="mt-8 text-center text-slate-500">검색 결과가 없습니다.</p>
      ) : null}
    </div>
  );
}
