"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import GuideSearchResultsList from "@/components/knowledge-hub/GuideSearchResultsList";
import { POPULAR_GUIDE_QUERIES, searchGuides } from "@/lib/knowledge-hub/search";

type Props = {
  variant?: "hero" | "compact";
  autoFocus?: boolean;
  initialQuery?: string;
};

export default function GuideSearch({ variant = "hero", autoFocus = false, initialQuery = "" }: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = query.trim() ? searchGuides(query, variant === "hero" ? 6 : 8) : [];

  const goToSearchPage = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const shellClass =
    variant === "hero"
      ? "relative rounded-2xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-100"
      : "relative rounded-xl border border-slate-200 bg-white shadow-sm";

  const inputClass =
    variant === "hero"
      ? "min-h-[52px] w-full bg-transparent py-3 pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
      : "min-h-[44px] w-full bg-transparent py-2 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <form
        className={shellClass}
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex >= 0 && results[activeIndex]) {
            router.push(results[activeIndex].path);
            setOpen(false);
            return;
          }
          goToSearchPage(query);
        }}
        role="search"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          청소 가이드 검색
        </label>
        <Search
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${variant === "hero" ? "left-4 h-5 w-5" : "left-3 h-4 w-4"}`}
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder="예: 욕실 곰팡이, 입주청소 순서, 사무실 화장실"
          className={inputClass}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={`${listId}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className={`absolute top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 ${variant === "hero" ? "right-3" : "right-2"}`}
            aria-label="검색어 지우기"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </form>

      {open && query.trim() && results.length > 0 ? (
        <div
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <ul className="max-h-[min(24rem,70vh)] overflow-y-auto p-2">
            {results.map((r, i) => (
              <li key={r.path} id={`${listId}-opt-${i}`} role="option" aria-selected={activeIndex === i}>
                <Link
                  href={r.path}
                  className={`block rounded-xl px-3 py-3 transition ${activeIndex === i ? "bg-teal-50" : "hover:bg-slate-50"}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="block font-bold text-slate-900">{r.h1}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{r.categoryName}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-teal-700 hover:bg-teal-50"
            onClick={() => goToSearchPage(query)}
          >
            &quot;{query.trim()}&quot; 전체 결과 보기
          </button>
        </div>
      ) : null}

      {variant === "hero" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_GUIDE_QUERIES.slice(0, 8).map((item) =>
            item.path ? (
              <Link
                key={item.label}
                href={item.path}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
                onClick={() => {
                  const q = item.query ?? item.label;
                  setQuery(q);
                  setOpen(true);
                  goToSearchPage(q);
                }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
