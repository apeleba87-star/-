"use client";

import { useState } from "react";
import { PhotoThumb } from "@/components/ai-blog/PhotoSource";
import { newBlockId, type ResolvedImage } from "@/components/ai-blog/content-helpers";
import { Chip, btnGhost, btnPrimary, card, input } from "@/components/ai-blog/ui";
import type { ContentBlock } from "@/lib/ai-blog/types";

const REWRITE_HINTS = ["더 짧게", "더 자세하게", "더 친근하게", "더 전문적으로", "키워드를 자연스럽게"];

export default function BlockEditor({
  title,
  titleCandidates,
  blocks,
  images,
  rewriteLeft,
  rewritingId,
  bannedFound,
  onTitle,
  onBlocks,
  onRewrite,
}: {
  title: string;
  titleCandidates: string[];
  blocks: ContentBlock[];
  images: Map<string, ResolvedImage>;
  rewriteLeft: number;
  rewritingId: string | null;
  bannedFound: string[];
  onTitle: (t: string) => void;
  onBlocks: (b: ContentBlock[]) => void;
  onRewrite: (blockId: string, hint: string) => void;
}) {
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  const setText = (id: string, text: string) =>
    onBlocks(blocks.map((b) => (b.id === id && b.type !== "image" ? { ...b, text } : b)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onBlocks(next);
  };
  const remove = (id: string) => onBlocks(blocks.filter((b) => b.id !== id));
  const insertAfter = (i: number, type: "paragraph" | "heading" = "paragraph") => {
    const next = [...blocks];
    next.splice(i + 1, 0, { id: newBlockId(), type, text: "" });
    onBlocks(next);
  };

  return (
    <div className="space-y-3">
      <section className={`${card} space-y-2 p-4`}>
        <label className="text-xs font-medium text-slate-600">제목</label>
        <input className={`${input} text-base font-semibold`} value={title} maxLength={200} onChange={(e) => onTitle(e.target.value)} />
        {titleCandidates.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-xs text-slate-400">다른 제목 후보</span>
            {titleCandidates.map((t) => (
              <Chip key={t} active={t === title} onClick={() => onTitle(t)}>
                {t}
              </Chip>
            ))}
          </div>
        ) : null}
        {bannedFound.length ? (
          <p className="text-xs text-rose-600">사용하지 않을 표현이 들어 있습니다: {bannedFound.join(", ")}</p>
        ) : null}
      </section>

      {blocks.map((b, i) => {
        const controls = (
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btnGhost} disabled={i === 0} onClick={() => move(i, -1)}>
              ▲
            </button>
            <button type="button" className={btnGhost} disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
              ▼
            </button>
            <button type="button" className={btnGhost} onClick={() => insertAfter(i)}>
              + 문단
            </button>
            <button type="button" className={btnGhost} onClick={() => insertAfter(i, "heading")}>
              + 소제목
            </button>
            <button type="button" className={`${btnGhost} text-rose-600`} onClick={() => remove(b.id)}>
              삭제
            </button>
          </div>
        );

        if (b.type === "heading") {
          return (
            <div key={b.id} className={`${card} space-y-1 border-l-4 border-l-emerald-500 p-3`}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  소제목
                </span>
                <input
                  className={`${input} font-bold`}
                  value={b.text}
                  maxLength={100}
                  placeholder="소제목을 입력하세요"
                  onChange={(e) => setText(b.id, e.target.value)}
                />
              </div>
              {controls}
            </div>
          );
        }

        if (b.type === "image") {
          const img = images.get(b.id);
          return (
            <div key={b.id} className={`${card} flex items-center gap-3 p-2`}>
              <PhotoThumb photo={img?.photo ?? null} name={img?.media?.local_name} className="h-16 w-20 rounded" />
              <div className="flex-1 text-xs text-slate-600">
                <span
                  className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                    b.role === "BEFORE" ? "bg-slate-700" : "bg-emerald-600"
                  }`}
                >
                  {b.role}
                </span>
                {img?.label || "사진"} · {img?.fileName}
              </div>
              {controls}
            </div>
          );
        }

        const busy = rewritingId === b.id;
        return (
          <div key={b.id} className={`${card} space-y-2 p-3 ${busy ? "opacity-60" : ""}`}>
            <textarea
              className={`${input} min-h-[72px] resize-none leading-relaxed [field-sizing:content]`}
              value={b.text}
              disabled={busy}
              placeholder="문단 내용을 입력하세요"
              onChange={(e) => setText(b.id, e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              {controls}
              <div className="flex-1" />
              <span className="text-[11px] text-slate-400">{b.text.length}자</span>
              <button
                type="button"
                className={btnGhost}
                disabled={busy || !b.text.trim() || rewriteLeft <= 0 || Boolean(rewritingId)}
                onClick={() => {
                  setHintFor(hintFor === b.id ? null : b.id);
                  setHint("");
                }}
              >
                {busy ? "AI가 다시 쓰는 중…" : `AI로 이 문단 다시 쓰기 (남은 ${rewriteLeft}회)`}
              </button>
            </div>
            {hintFor === b.id ? (
              <div className="space-y-2 rounded-lg bg-slate-50 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {REWRITE_HINTS.map((h) => (
                    <Chip key={h} active={hint === h} onClick={() => setHint(h)}>
                      {h}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={input}
                    value={hint}
                    maxLength={200}
                    placeholder="원하는 방향 (선택)"
                    onChange={(e) => setHint(e.target.value)}
                  />
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setHintFor(null);
                      onRewrite(b.id, hint);
                    }}
                  >
                    다시 쓰기
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:bg-white"
          onClick={() => insertAfter(blocks.length - 1, "heading")}
        >
          + 맨 아래에 소제목
        </button>
        <button
          type="button"
          className="rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:bg-white"
          onClick={() => insertAfter(blocks.length - 1)}
        >
          + 맨 아래에 문단
        </button>
      </div>
    </div>
  );
}
