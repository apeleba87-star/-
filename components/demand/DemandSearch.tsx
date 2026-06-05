"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { pickDemandSearchNavigate, searchDemand, type DemandSearchResult } from "@/lib/demand/search";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "hero" | "bar";
  /** URL의 q와 동기화 (검색 결과 페이지) */
  initialQuery?: string;
  autoFocus?: boolean;
  placeholder?: string;
  /** 허브: 구 선택 시 페이지 이동 대신 비교 목록에 추가 */
  onDistrictAdd?: (slug: string) => void;
};

export default function DemandSearch({
  variant = "bar",
  initialQuery = "",
  autoFocus = false,
  placeholder = "구 또는 키워드 (예: 강서, 입주청소, 양천)",
  onDistrictAdd,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const results = useMemo(() => searchDemand(query), [query]);

  const submit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const hits = searchDemand(trimmed);
      const top = hits[0];
      if (onDistrictAdd && top?.type === "district" && top.score >= 80) {
        const slug = top.href.replace(/^\/demand\/region\//, "");
        if (slug) {
          onDistrictAdd(slug);
          setQuery("");
          setOpen(false);
          return;
        }
      }
      const href = pickDemandSearchNavigate(trimmed, hits);
      if (href) {
        setOpen(false);
        router.push(href);
      }
    },
    [router, onDistrictAdd]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && results[activeIndex]) {
        const hit = results[activeIndex]!;
        if (onDistrictAdd && hit.type === "district") {
          const slug = hit.href.replace(/^\/demand\/region\//, "");
          if (slug) {
            onDistrictAdd(slug);
            setQuery("");
            setOpen(false);
            return;
          }
        }
        router.push(hit.href);
        setOpen(false);
      } else {
        submit(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isHero = variant === "hero";

  return (
    <div className={cn("relative", isHero ? "mb-8" : "mb-6")}>
      <label htmlFor={listId} className="sr-only">
        구 또는 키워드 검색
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-white shadow-sm ring-1 ring-slate-200/80",
          isHero ? "border-teal-200 px-4 py-3 shadow-md ring-teal-100/80" : "px-3 py-2"
        )}
      >
        <Search className={cn("shrink-0 text-slate-400", isHero ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none",
            isHero ? "text-lg font-medium" : "text-sm"
          )}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button
          type="button"
          onClick={() => submit(query)}
          className={cn(
            "shrink-0 rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800",
            isHero ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
          )}
        >
          검색
        </button>
      </div>

      {open && query.trim().length > 0 ? (
        <SearchResultsPanel
          results={results}
          query={query}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onPick={() => setOpen(false)}
          onDistrictAdd={onDistrictAdd}
        />
      ) : null}

      {isHero && !onDistrictAdd ? (
        <p className="mt-2 text-xs text-slate-500">구·키워드를 검색해 해당 페이지로 이동합니다.</p>
      ) : null}
    </div>
  );
}

function SearchResultsPanel({
  results,
  query,
  activeIndex,
  onHover,
  onPick,
  onDistrictAdd,
}: {
  results: DemandSearchResult[];
  query: string;
  activeIndex: number;
  onHover: (i: number) => void;
  onPick: () => void;
  onDistrictAdd?: (slug: string) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <p className="text-sm text-slate-600">「{query}」에 맞는 구·키워드가 없습니다.</p>
        <Link
          href={`/demand/search?q=${encodeURIComponent(query)}`}
          className="mt-2 inline-block text-sm font-semibold text-teal-700 hover:underline"
          onClick={onPick}
        >
          전체 검색 결과 보기
        </Link>
      </div>
    );
  }

  return (
    <ul
      className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
      role="listbox"
    >
      {results.map((r, i) => (
        <li key={r.id} role="option" aria-selected={i === activeIndex}>
          {onDistrictAdd && r.type === "district" ? (
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onClick={() => {
                const slug = r.href.replace(/^\/demand\/region\//, "");
                if (slug) onDistrictAdd(slug);
                onPick();
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm",
                i === activeIndex ? "bg-teal-50" : "hover:bg-slate-50"
              )}
            >
              <span>
                <span className="font-semibold text-slate-900">{r.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{r.subtitle}</span>
              </span>
              <span className="shrink-0 rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                비교 추가
              </span>
            </button>
          ) : (
            <Link
              href={r.href}
              onMouseEnter={() => onHover(i)}
              onClick={onPick}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                i === activeIndex ? "bg-teal-50" : "hover:bg-slate-50"
              )}
            >
              <span>
                <span className="font-semibold text-slate-900">{r.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{r.subtitle}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                  r.type === "district" ? "bg-teal-100 text-teal-800" : "bg-violet-100 text-violet-800"
                )}
              >
                {r.type === "district" ? "지역" : "키워드"}
              </span>
            </Link>
          )}
        </li>
      ))}
      {results.length >= 8 ? (
        <li className="border-t border-slate-100 px-4 py-2">
          <Link
            href={`/demand/search?q=${encodeURIComponent(query)}`}
            className="text-xs font-semibold text-slate-500 hover:text-teal-700"
            onClick={onPick}
          >
            더 보기 →
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
