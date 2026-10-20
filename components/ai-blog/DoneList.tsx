"use client";

import Link from "next/link";
import { useState } from "react";

export type DoneListItem = {
  id: string;
  date: string;
  title: string;
  service: string;
  label: string;
  cta: string;
  href: string;
  badge: string;
};

const PAGE = 5;

export default function DoneList({ items }: { items: DoneListItem[] }) {
  const [shown, setShown] = useState(PAGE);
  const visible = items.slice(0, shown);
  const left = items.length - visible.length;

  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-700">완료 · 보관</h2>
        <span className="text-xs text-slate-400">{items.length}건</span>
      </div>
      <ul className="divide-y divide-slate-100/80">
        {visible.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-slate-600 transition hover:bg-slate-50"
            >
              <span className="w-12 shrink-0 text-center text-[11px] text-slate-400">{item.date}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-700">{item.title}</span>
                <span className="text-xs text-slate-400">{item.service}</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.badge}`}>{item.label}</span>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {item.cta}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {left > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <button
            type="button"
            className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
            onClick={() => setShown((n) => n + PAGE)}
          >
            완료 글 {left}건 더 보기
          </button>
        </div>
      ) : items.length > PAGE ? (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline"
            onClick={() => setShown(PAGE)}
          >
            접기
          </button>
        </div>
      ) : null}
    </section>
  );
}
