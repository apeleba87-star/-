"use client";

import { useState, type ReactNode } from "react";

export const card = "rounded-xl border border-slate-200 bg-white";
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
export const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "error" | "info" | "success" | "warning"; children: ReactNode }) {
  const cls = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

/** 기본 항목 칩 + 직접 입력 추가. multiple 이면 최대 max 개까지 선택 */
export function ChoiceWithCustom({
  options,
  selected,
  onChange,
  multiple = false,
  max = 10,
  placeholder = "직접 입력",
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  max?: number;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const all = [...new Set([...options, ...selected])];
  const full = multiple && selected.length >= max;

  const toggle = (v: string) => {
    if (!multiple) return onChange([v]);
    if (selected.includes(v)) return onChange(selected.filter((x) => x !== v));
    if (!full) onChange([...selected, v]);
  };
  const add = () => {
    const t = draft.trim().slice(0, 30);
    if (!t) return;
    if (!selected.includes(t)) {
      if (!multiple) onChange([t]);
      else if (!full) onChange([...selected, t]);
    }
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {all.map((v) => (
          <Chip key={v} active={selected.includes(v)} onClick={() => toggle(v)}>
            {v}
          </Chip>
        ))}
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              className="w-36 rounded-full border border-slate-300 px-3 py-1 text-xs focus:border-emerald-500 focus:outline-none"
              value={draft}
              maxLength={30}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                } else if (e.key === "Escape") {
                  setAdding(false);
                }
              }}
            />
            <button type="button" className={btnGhost} onClick={add}>
              추가
            </button>
            <button type="button" className={btnGhost} onClick={() => setAdding(false)}>
              취소
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={full}
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-600 disabled:opacity-40"
          >
            + 추가하기
          </button>
        )}
      </div>
      {multiple ? (
        <p className="text-xs text-slate-400">
          {selected.length}/{max}개 선택{full ? " · 최대 개수입니다" : ""}
        </p>
      ) : null}
    </div>
  );
}

export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Chip key={v} title="눌러서 삭제" onClick={() => onChange(values.filter((x) => x !== v))}>
              {v} ×
            </Chip>
          ))}
        </div>
      ) : null}
      <input
        className={input}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || (e.key !== "Enter" && e.key !== ",")) return;
          e.preventDefault();
          const t = e.currentTarget.value.trim().replace(/,$/, "");
          if (t && !values.includes(t)) onChange([...values, t]);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
