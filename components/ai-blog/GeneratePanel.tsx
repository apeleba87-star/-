"use client";

import { useEffect, useState } from "react";
import { Chip, Field, Notice, TagInput, btnPrimary, card, input } from "@/components/ai-blog/ui";
import { BLOG_MODES, CLOSING_LABELS, INTRO_LABELS } from "@/lib/ai-blog/modes";
import type { BlogMode, Content, MediaPair, UsageSummary } from "@/lib/ai-blog/types";

const EXTRA_HINTS = [
  "고객님이 특히 만족하신 부분",
  "작업하면서 가장 신경 쓴 부분",
  "이번 현장만의 특이사항",
  "아이·반려동물이 있는 집이라 신경 쓴 점",
  "다음 청소 추천 시기",
  "함께 진행한 추가 작업",
];

const PROGRESS = ["현장 정보와 사진 순서를 정리하는 중", "청소 지식을 확인하는 중", "글을 쓰는 중", "사진 위치를 맞추는 중"];

export type GenerateRequest = {
  keyword: string;
  secondary_keywords: string[];
  extra_request: string;
  mode: BlogMode;
  random: boolean;
};

export default function GeneratePanel({
  content,
  pairs,
  knowledgePreview,
  usage,
  generating,
  onGenerate,
  locked = false,
}: {
  content: Content;
  pairs: MediaPair[];
  knowledgePreview: { title: string; basis: string }[];
  usage: UsageSummary | null;
  generating: boolean;
  onGenerate: (req: GenerateRequest) => void;
  locked?: boolean;
}) {
  const [mode, setMode] = useState<BlogMode>(content.mode ?? 1);
  const [random, setRandom] = useState(false);
  const [keyword, setKeyword] = useState(content.keyword);
  const [secondary, setSecondary] = useState<string[]>(content.secondary_keywords);
  const [extra, setExtra] = useState(content.extra_request);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!generating) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generating]);

  const maxGen = usage?.max_generations_per_content ?? 3;
  const used = content.generation_count;
  const isFirst = used === 0;
  const monthlyFull = Boolean(usage && isFirst && usage.contents_used >= usage.monthly_content_limit);
  const genFull = used >= maxGen;
  const usablePairs = pairs.filter((p) => p.before_media_id || p.after_media_id);

  const submit = () => {
    if (!isFirst && content.blocks.length && !window.confirm("지금 글을 새 AI 초안으로 바꿀까요? 지금 글은 이전 버전으로 보관됩니다.")) return;
    onGenerate({ keyword, secondary_keywords: secondary, extra_request: extra, mode, random });
  };

  const addHint = (h: string) => setExtra((prev) => `${prev.trim() ? `${prev.trim()}\n` : ""}${h}: `.slice(0, 600));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <section className={`${card} space-y-3 p-4`}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">글 느낌 고르기</h3>
            <div className="flex-1" />
            <Chip active={random} onClick={() => setRandom((r) => !r)} title="모드와 도입·마무리 방식을 매번 다르게 고릅니다">
              랜덤으로
            </Chip>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {BLOG_MODES.map((m) => {
              const active = !random && mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setRandom(false);
                    setMode(m.id);
                  }}
                  className={`rounded-lg border p-3 text-left transition ${
                    active ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  } ${random ? "opacity-50" : ""}`}
                >
                  <p className="text-xs font-semibold text-emerald-700">모드 {m.id}</p>
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                  <p className="mt-2 text-xs italic text-slate-400">&ldquo;{m.sample}&rdquo;</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            {random
              ? "AI가 직전과 다른 모드를 고르고, 도입과 마무리 방식도 매번 바꿉니다."
              : "같은 모드라도 생성할 때마다 도입·마무리 방식이 바뀌어 매번 다른 글이 나옵니다."}
            {content.variant
              ? ` 직전 초안: ${INTRO_LABELS[content.variant.intro] ?? ""} · ${CLOSING_LABELS[content.variant.closing] ?? ""}`
              : ""}
          </p>
        </section>

        <section className={`${card} space-y-3 p-4`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="메인 키워드" hint="제목과 본문에 자연스럽게 들어갑니다.">
              <input className={input} value={keyword} maxLength={60} onChange={(e) => setKeyword(e.target.value)} />
            </Field>
            <Field label="보조 키워드 (선택)" hint="입력 후 Enter">
              <TagInput values={secondary} onChange={setSecondary} placeholder="예: 신축 아파트 입주청소" />
            </Field>
          </div>
          <Field label="이번 글에 꼭 넣고 싶은 내용 (선택)" hint="한두 줄이면 충분합니다. 기본 작성 규칙은 이미 들어가 있습니다.">
            <textarea
              className={input}
              rows={3}
              maxLength={600}
              value={extra}
              placeholder="예: 고객님이 베란다 곰팡이를 제일 걱정하셨음"
              onChange={(e) => setExtra(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {EXTRA_HINTS.map((h) => (
              <Chip key={h} onClick={() => addHint(h)}>
                + {h}
              </Chip>
            ))}
          </div>
        </section>

        <section className={`${card} space-y-3 p-4`}>
          {locked ? (
            <Notice tone="warning">AI 블로그 이용 기간이 아니어서 AI 생성을 할 수 없습니다. 기존 글 편집과 네이버로 옮기기는 계속 가능합니다.</Notice>
          ) : null}
          {monthlyFull ? <Notice tone="warning">이번 달 블로그 작성 한도를 모두 사용했습니다.</Notice> : null}
          {genFull ? (
            <Notice tone="info">이 초안의 AI 생성 {maxGen}회를 모두 사용했습니다. 편집 화면에서 직접 고치거나 문단 다시쓰기를 이용해 주세요.</Notice>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              disabled={locked || generating || monthlyFull || genFull || !keyword.trim()}
              onClick={submit}
            >
              {generating ? "AI가 작성 중…" : isFirst ? "AI 초안 생성" : "전체 다시 생성"}
            </button>
            <span className="text-xs text-slate-600">
              이 초안 AI 생성 {used}/{maxGen}회
              {isFirst && usage ? ` · 생성하면 이번 달 ${usage.contents_used + 1}/${usage.monthly_content_limit}편째` : ""}
            </span>
          </div>
          {generating ? (
            <div className="space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${Math.min(95, elapsed * 3)}%` }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {PROGRESS[Math.min(PROGRESS.length - 1, Math.floor(elapsed / 6))]}… ({elapsed}초) 보통 20~40초 걸립니다.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <section className={`${card} p-4`}>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">AI에게 전달되는 사진 순서</h3>
          {usablePairs.length ? (
            <ol className="space-y-1.5 text-sm">
              {usablePairs.map((p, i) => (
                <li key={p.id} className="flex gap-2">
                  <span className="w-5 font-semibold text-slate-400">{i + 1}</span>
                  <span className="flex-1">
                    <span className="font-medium text-slate-900">{p.label || "이름 없음"}</span>
                    {p.memo ? <span className="text-slate-500"> · {p.memo}</span> : null}
                  </span>
                  <span className="text-xs text-slate-400">
                    {[p.before_media_id ? "전" : null, p.after_media_id ? "후" : null].filter(Boolean).join("/")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">정렬된 사진 짝이 없습니다. 사진 없이 글만 작성됩니다.</p>
          )}
          <p className="mt-2 text-xs text-slate-400">사진 파일은 보내지 않습니다. 짝 이름과 메모만 전달됩니다.</p>
        </section>

        <section className={`${card} p-4`}>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">참고하는 청소 지식</h3>
          {knowledgePreview.length ? (
            <ul className="space-y-1.5 text-sm">
              {knowledgePreview.map((k, i) => (
                <li key={`${k.title}-${i}`}>
                  <span className="font-medium text-slate-900">{k.title}</span>
                  <span className="text-xs text-slate-500"> · {k.basis}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              클린아이덱스 기본 작성 원칙에 따라 과장 없이 사실 위주로 작성합니다.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
