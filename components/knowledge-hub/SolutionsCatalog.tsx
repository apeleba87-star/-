"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { SolutionCardData } from "@/lib/knowledge-hub/solutions/get-solutions";
import {
  HOME_SPACE_ORDER,
  KITCHEN_PART_ORDER,
  PLACE_SPACE_ORDER,
  PRIMARY_PLACE_ORDER,
  getPlaceLabel,
  getSpaceLabel,
  spaceIdsForUiSelection,
} from "@/lib/knowledge-hub/solutions/taxonomy";

export type { SolutionCardData };

type Props = {
  pages: SolutionCardData[];
  title?: string;
  subtitle?: string;
};

type Step = "place" | "space" | "part" | "list";

type SpaceChoice = {
  /** UI selection key (restroom for home bath combo) */
  id: string;
  label: string;
  matchIds: string[];
  n: number;
  comingSoon?: boolean;
};

function countBySpace(pages: SolutionCardData[], placeId: string): Map<string, number> {
  const bySpace = new Map<string, number>();
  for (const p of pages) {
    if (p.placeId !== placeId) continue;
    bySpace.set(p.spaceId, (bySpace.get(p.spaceId) ?? 0) + 1);
  }
  return bySpace;
}

export default function SolutionsCatalog({
  pages,
  title = "오염으로 찾기",
  subtitle = "아는 것부터 고르거나, 위에서 검색하세요.",
}: Props) {
  const [q, setQ] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [partId, setPartId] = useState("");

  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  const searchHits = useMemo(() => {
    if (!query) return [];
    return pages.filter((p) => {
      const hay = [p.title, p.placeLabel, p.spaceLabel, p.partLabel]
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "");
      return hay.includes(query);
    });
  }, [pages, query]);

  const places = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of pages) {
      count.set(p.placeId, (count.get(p.placeId) ?? 0) + 1);
    }
    return PRIMARY_PLACE_ORDER.map((id) => ({
      id,
      label: getPlaceLabel(id),
      n: count.get(id) ?? 0,
    }));
  }, [pages]);

  const spaces: SpaceChoice[] = useMemo(() => {
    if (!placeId) return [];

    const bySpace = countBySpace(pages, placeId);
    const order = PLACE_SPACE_ORDER[placeId as keyof typeof PLACE_SPACE_ORDER] ?? HOME_SPACE_ORDER;

    const fromOrder: SpaceChoice[] = order.map((id) => {
      const matchIds = spaceIdsForUiSelection(placeId, id);
      const n = matchIds.reduce((sum, sid) => sum + (bySpace.get(sid) ?? 0), 0);
      return {
        id,
        label: getSpaceLabel(id, placeId),
        matchIds,
        n,
        comingSoon: n === 0,
      };
    });

    // 순서에 없지만 페이지가 있는 공간 추가
    for (const [sid, n] of bySpace) {
      if (fromOrder.some((s) => s.matchIds.includes(sid))) continue;
      fromOrder.push({
        id: sid,
        label: getSpaceLabel(sid, placeId),
        matchIds: [sid],
        n,
        comingSoon: false,
      });
    }
    return fromOrder;
  }, [pages, placeId]);

  const activeSpace = spaces.find((s) => s.id === spaceId);
  const matchSpaceIds = activeSpace?.matchIds ?? (spaceId ? spaceIdsForUiSelection(placeId, spaceId) : []);

  const parts = useMemo(() => {
    if (!placeId || !spaceId) return [];
    const map = new Map<string, { id: string; label: string; n: number }>();
    for (const p of pages) {
      if (p.placeId !== placeId) continue;
      if (!matchSpaceIds.includes(p.spaceId)) continue;
      const cur = map.get(p.partId);
      if (cur) cur.n += 1;
      else map.set(p.partId, { id: p.partId, label: p.partLabel, n: 1 });
    }
    const list = [...map.values()];
    if (spaceId === "kitchen") {
      list.sort((a, b) => {
        const ai = KITCHEN_PART_ORDER.indexOf(a.id as (typeof KITCHEN_PART_ORDER)[number]);
        const bi = KITCHEN_PART_ORDER.indexOf(b.id as (typeof KITCHEN_PART_ORDER)[number]);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    return list;
  }, [pages, placeId, spaceId, matchSpaceIds]);

  const finalList = useMemo(() => {
    if (!placeId || !spaceId || !partId) return [];
    return pages.filter(
      (p) =>
        p.placeId === placeId && matchSpaceIds.includes(p.spaceId) && p.partId === partId
    );
  }, [pages, placeId, spaceId, partId, matchSpaceIds]);

  const step: Step = !placeId ? "place" : !spaceId ? "space" : !partId ? "part" : "list";

  const placeLabel = places.find((p) => p.id === placeId)?.label;
  const spaceLabel = activeSpace?.label;
  const partLabel = parts.find((p) => p.id === partId)?.label;

  function goBack() {
    if (step === "list") setPartId("");
    else if (step === "part") setSpaceId("");
    else if (step === "space") setPlaceId("");
  }

  const searching = Boolean(query);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-base text-slate-600">{subtitle}</p>

      <div className="relative mt-6">
        <label htmlFor="solution-search" className="sr-only">
          검색어 검색
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="solution-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="예: 변기 요석, 수전 물때, 실리콘 곰팡이"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-800/25"
        />
      </div>

      {searching ? (
        <div className="mt-6">
          <p className="text-sm text-slate-500">{searchHits.length}건 일치</p>
          {searchHits.length ? (
            <ul className="mt-3 space-y-2">
              {searchHits.map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.path}
                    className="block rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-teal-300"
                  >
                    <span className="block text-base font-black text-slate-950">{p.title}</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {p.placeLabel} · {p.spaceLabel} · {p.partLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-center text-slate-500">일치하는 검색어가 없습니다.</p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {step !== "place" ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                뒤로
              </button>
              <p className="text-sm text-slate-500">
                {[placeLabel, spaceLabel, partLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}

          {step === "place" ? (
            <>
              <p className="text-base font-bold text-slate-800">어디에서 청소하나요?</p>
              <ul className="mt-3 space-y-2">
                {places.map((pl) => (
                  <li key={pl.id}>
                    <ChoiceButton
                      label={pl.label}
                      hint={pl.n ? `${pl.n}개 가이드` : "준비중"}
                      disabled={pl.n === 0}
                      onClick={() => {
                        if (!pl.n) return;
                        setPlaceId(pl.id);
                        setSpaceId("");
                        setPartId("");
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {step === "space" ? (
            <>
              <p className="text-base font-bold text-slate-800">어느 공간인가요?</p>
              <ul className="mt-3 space-y-2">
                {spaces.map((sp) => (
                  <li key={sp.id}>
                    <ChoiceButton
                      label={sp.label}
                      hint={sp.comingSoon ? "준비중" : `${sp.n}개`}
                      disabled={sp.comingSoon}
                      onClick={() => {
                        if (sp.comingSoon) return;
                        setSpaceId(sp.id);
                        setPartId("");
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {step === "part" ? (
            <>
              <p className="text-base font-bold text-slate-800">어느 부위인가요?</p>
              <ul className="mt-3 space-y-2">
                {parts.map((pt) => (
                  <li key={pt.id}>
                    <ChoiceButton
                      label={pt.label}
                      hint={`${pt.n}개 오염`}
                      onClick={() => setPartId(pt.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {step === "list" ? (
            <>
              <p className="text-base font-bold text-slate-800">어떤 오염인가요?</p>
              <ul className="mt-3 space-y-2">
                {finalList.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.path}
                      className="group flex items-center gap-3 rounded-2xl border-2 border-slate-900 bg-white px-4 py-4 transition hover:bg-teal-50"
                    >
                      <span className="min-w-0 flex-1 text-left text-lg font-black text-slate-950">
                        {shortContaminantTitle(p.title, p.placeLabel, p.spaceLabel, p.partLabel)}
                      </span>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-teal-800"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ChoiceButton({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70"
          : "border-slate-900 bg-white hover:bg-teal-50 active:scale-[0.99]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block text-xl font-black ${disabled ? "text-slate-500" : "text-slate-950"}`}>
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-slate-500">{hint}</span>
      </span>
      {!disabled ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-teal-800" aria-hidden />
      ) : null}
    </button>
  );
}

function shortContaminantTitle(
  title: string,
  placeLabel: string,
  spaceLabel: string,
  partLabel: string
): string {
  let t = title;
  const spaceVariants = [spaceLabel, "화장실", "욕실", "화장실·욕실"];
  for (const space of spaceVariants) {
    for (const prefix of [
      `${placeLabel} ${space} ${partLabel} `,
      `${placeLabel} ${space} `,
      `${placeLabel} `,
    ]) {
      if (t.startsWith(prefix)) {
        t = t.slice(prefix.length);
        return t.replace(/\s*제거\s*$/, "") || title;
      }
    }
  }
  return t.replace(/\s*제거\s*$/, "") || title;
}
