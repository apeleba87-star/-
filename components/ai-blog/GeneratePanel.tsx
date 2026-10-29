"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip, Field, Notice, TagInput, btnPrimary, card, input } from "@/components/ai-blog/ui";
import { BLOG_MODES } from "@/lib/ai-blog/modes";
import type { BlogMode, Content, MediaPair, UsageSummary } from "@/lib/ai-blog/types";

const EXTRA_HINTS = [
  "고객님이 특히 만족하신 부분",
  "작업하면서 가장 신경 쓴 부분",
  "이번 현장만의 특이사항",
  "아이·반려동물이 있는 집이라 신경 쓴 점",
  "다음 청소 추천 시기",
  "함께 진행한 추가 작업",
];

const WORK_STEPS = [
  { at: 0, title: "현장 정보 확인", desc: "지역·서비스·특이사항을 읽고 있습니다" },
  { at: 6, title: "사진 순서 정리", desc: "전·후 세트 순서에 맞춰 구성을 잡습니다" },
  { at: 14, title: "청소 지식 참고", desc: "과장 없이 쓸 내용을 고르고 있습니다" },
  { at: 22, title: "문장 작성 중", desc: "제목과 본문을 쓰고 있습니다" },
  { at: 32, title: "사진 자리 맞추기", desc: "글 사이사이에 전·후 사진을 넣고 있습니다" },
];

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
  const router = useRouter();
  const pathname = usePathname();
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
  const subscribeHref = `/ai-blog/subscribe?next=${encodeURIComponent(pathname || `/ai-blog/contents/${content.id}`)}`;

  const submit = () => {
    if (locked) {
      router.push(subscribeHref);
      return;
    }
    if (!isFirst && content.blocks.length && !window.confirm("지금 글을 지우고 새로 만들까요?")) return;
    onGenerate({ keyword, secondary_keywords: secondary, extra_request: extra, mode, random });
  };

  const addHint = (h: string) => setExtra((prev) => `${prev.trim() ? `${prev.trim()}\n` : ""}${h}: `.slice(0, 600));

  const modeName = BLOG_MODES.find((m) => m.id === mode)?.name ?? "";
  const activeStep = [...WORK_STEPS].reverse().find((s) => elapsed >= s.at) ?? WORK_STEPS[0];
  const barPct = Math.min(92, 8 + elapsed * 2.4);

  if (generating) {
    return (
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-200">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">AI가 지금 글을 만들고 있습니다</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{activeStep.title}</h2>
            <p className="mt-2 text-base text-slate-600">{activeStep.desc}</p>
            <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{elapsed}초</p>
            <p className="mt-1 text-sm text-slate-500">보통 20~40초 걸립니다. 이 화면을 닫지 마세요.</p>
            <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-10 lg:grid-cols-2">
          <ol className="space-y-3">
            {WORK_STEPS.map((s, i) => {
              const done = elapsed >= (WORK_STEPS[i + 1]?.at ?? 999) || (i === WORK_STEPS.length - 1 && elapsed >= s.at + 8);
              const current = activeStep.title === s.title && !done;
              const started = elapsed >= s.at;
              return (
                <li
                  key={s.title}
                  className={`flex gap-3 rounded-xl px-3 py-2.5 ${
                    current ? "bg-emerald-50 ring-1 ring-emerald-200" : started ? "bg-slate-50" : "opacity-40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${current ? "text-emerald-900" : "text-slate-800"}`}>{s.title}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">지금 참고하는 내용</p>
            <p>
              <span className="text-slate-500">글 느낌</span> · {random ? "랜덤" : modeName}
            </p>
            <p>
              <span className="text-slate-500">키워드</span> · {keyword || "-"}
            </p>
            <p>
              <span className="text-slate-500">전·후 사진</span> · {usablePairs.length}세트
              {usablePairs.length ? " (장소·오염 상태만 전달, 사진 파일은 안 보냄)" : ""}
            </p>
            <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
              끝나면 자동으로 「고치기」 화면으로 넘어갑니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <section className={`${card} space-y-3 p-4`}>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">어떤 느낌의 글로 쓸까요?</h3>
            <div className="flex-1" />
            <Chip active={random} onClick={() => setRandom((r) => !r)} title="매번 다른 느낌으로">
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
                  className={`rounded-lg border p-4 text-left transition ${
                    active ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  } ${random ? "opacity-50" : ""}`}
                >
                  <p className="text-base font-bold text-slate-900">{m.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">대부분 그대로 두셔도 됩니다. 고치고 싶을 때만 아래를 여세요.</p>
        </section>

        <details className={`${card} p-4`}>
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">키워드 · 넣고 싶은 내용 ▾</summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="메인 키워드" hint="제목과 본문에 자연스럽게 들어갑니다.">
                <input className={input} value={keyword} maxLength={60} onChange={(e) => setKeyword(e.target.value)} />
              </Field>
              <Field label="보조 키워드 (선택)" hint="입력 후 Enter">
                <TagInput values={secondary} onChange={setSecondary} placeholder="예: 신축 아파트 입주청소" />
              </Field>
            </div>
            <Field label="이번 글에 꼭 넣고 싶은 내용 (선택)" hint="한두 줄이면 충분합니다.">
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
          </div>
        </details>

        <section className={`${card} space-y-3 p-4`}>
          {locked ? (
            <Notice tone="warning">
              키워드·사진까지 준비한 뒤 「AI로 글 만들기」를 누르면 구독 확인으로 이동합니다.{" "}
              <Link href={subscribeHref} className="font-semibold underline">
                지금 구독하기
              </Link>
            </Notice>
          ) : null}
          {monthlyFull ? <Notice tone="warning">이번 달 블로그 작성 한도를 모두 사용했습니다.</Notice> : null}
          {genFull ? (
            <Notice tone="info">이 글의 AI 생성 {maxGen}회를 모두 사용했습니다. 「고치기」에서 직접 고치거나 문단만 다시 쓰세요.</Notice>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`${btnPrimary} px-6 py-3 text-base`}
              disabled={monthlyFull || genFull || !keyword.trim()}
              onClick={submit}
            >
              {locked ? "AI로 글 만들기 (구독 확인)" : isFirst ? "AI로 글 만들기" : "전체 다시 만들기"}
            </button>
            <span className="text-xs text-slate-600">
              이번 글 AI {used}/{maxGen}회
              {isFirst && usage
                ? ` · 이번 달 남은 글 ${Math.max(usage.monthly_content_limit - usage.contents_used, 0)}편`
                : ""}
            </span>
          </div>
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
          <p className="mt-2 text-xs text-slate-400">사진 파일은 보내지 않습니다. 장소와 오염 상태만 전달됩니다.</p>
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
