"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HOME_CLEAN_INDEX_BETA } from "@/lib/copy/home-clean-index";
import {
  Camera,
  CheckSquare,
  ClipboardList,
  PenLine,
  User,
} from "lucide-react";

const DISPLAY = "[font-family:var(--font-site-display),sans-serif]";

type CheckKey = "late-pay" | "claim-stress" | "photos-scattered" | "staff-verify";

const FEATURES = [
  { label: "RECORD", title: "현장 기록 관리", body: "작업 전후 사진을 한 곳에서 관리. 현장별로 정리되어 언제든 꺼낼 수 있습니다." },
  { label: "CHECKLIST", title: "작업 체크리스트", body: "업종별 맞춤 체크리스트로 누락 없이 작업 완료를 확인합니다." },
  { label: "SIGNATURE", title: "전자서명", body: "현장에서 고객 확인과 서명을 즉시 받습니다. 분쟁의 여지를 없앱니다." },
  { label: "REPORT", title: "작업 완료 보고서", body: "작업 기록이 자동으로 보고서가 됩니다. 고객에게 즉시 공유 가능합니다." },
  { label: "EVIDENCE", title: "분쟁 대비 자료 보관", body: "타임스탬프와 함께 모든 기록이 저장됩니다. 필요할 때 증거로 제출하세요." },
  { label: "CONFIRM", title: "고객 확인 기록", body: "\"몰랐다\"는 말이 통하지 않도록 고객의 확인 내역을 기록합니다." },
] as const;

export default function HomeCleanidexNarrative() {
  const rootRef = useRef<HTMLElement>(null);
  const [checked, setChecked] = useState<Set<CheckKey>>(new Set());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".narr-fade");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("narr-fade-in");
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toggle = useCallback((k: CheckKey) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }, []);

  const anyChecked = checked.size > 0;

  return (
    <article
      ref={rootRef}
      className="flex w-full flex-col gap-10 sm:gap-12 lg:gap-14"
      aria-label="클린아이덱스 소개"
    >
      {/* Hero — 홈 카드 톤 */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/60 bg-white px-5 py-12 shadow-[0_24px_48px_-28px_rgba(24,24,27,0.14)] sm:rounded-[2rem] sm:px-8 sm:py-14 lg:px-10 lg:py-16"
        aria-labelledby="cleanidex-narrative-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white to-violet-100/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 font-mono text-[clamp(4rem,18vw,10rem)] font-bold leading-none tracking-[0.12em] text-zinc-200/40"
          aria-hidden
        >
          LOG
        </div>
        <div className="relative z-[1]">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/90 bg-teal-50/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-teal-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.45)]" />
              {HOME_CLEAN_INDEX_BETA.status}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              현장업 완료 증거 시스템
            </span>
          </div>
          <h1
            id="cleanidex-narrative-hero-heading"
            className={`${DISPLAY} max-w-[18ch] text-[clamp(2rem,6vw,3.75rem)] font-normal leading-[1.08] tracking-[-0.06em] text-zinc-900 sm:max-w-none`}
          >
            계약서 쓰고도
            <br />
            <span className="relative text-zinc-500">
              돈 못 받는
              <span
                className="pointer-events-none absolute left-0 right-0 top-[52%] h-0.5 rotate-[-2deg] bg-rose-500/90"
                aria-hidden
              />
            </span>{" "}
            시대,
            <br />
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              끝냅니다.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-zinc-600 sm:text-base">
            현장 사진 · 체크리스트 · 고객확인 기록으로
            <br />
            <strong className="font-semibold text-zinc-900">&quot;작업 완료&quot;를 증명하는 서비스</strong>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/beta"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-500 hover:to-emerald-500"
            >
              무료로 시작하기
            </Link>
            <Link
              href="#cleanidex-solution"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-zinc-200 bg-white/80 px-6 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              서비스 소개 보기
            </Link>
          </div>
          <p className="mt-4 max-w-lg text-pretty text-xs leading-relaxed text-zinc-500 sm:text-sm">
            {HOME_CLEAN_INDEX_BETA.heroNote}
          </p>
          <div className="mt-10 text-xs font-semibold uppercase tracking-wider text-zinc-400">scroll</div>
          <p className="mt-1 text-sm font-semibold text-zinc-700">왜 현장업은 돈을 못 받을까?</p>
          <span className="mt-1 inline-block text-teal-600 motion-safe:animate-bounce" aria-hidden>
            ↓
          </span>
        </div>
      </section>

      {/* Problem */}
      <section
        className="narr-fade rounded-[1.75rem] border border-zinc-800/20 bg-zinc-900 px-5 py-12 text-white sm:rounded-[2rem] sm:px-8 sm:py-14"
        aria-labelledby="cleanidex-problem-heading"
      >
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-zinc-500">Problem</p>
        <div className="mt-10 space-y-0" id="cleanidex-problem-heading">
          <p
            className={`${DISPLAY} border-b border-white/10 py-3 text-[clamp(1.5rem,4vw,2.75rem)] tracking-[-0.04em] text-white transition-colors hover:text-zinc-200`}
          >
            청소는 끝났습니다.
          </p>
          <p
            className={`${DISPLAY} py-3 text-[clamp(1.5rem,4vw,2.75rem)] tracking-[-0.03em] text-zinc-500 transition-colors hover:text-zinc-200`}
          >
            근데 입금은 안됐습니다.
          </p>
        </div>
        <blockquote className="narr-fade mt-6 border-l-2 border-white/25 pl-4 text-sm italic text-zinc-400 sm:text-base">
          &quot;마음에 안 드네요.&quot;
        </blockquote>
        <blockquote className="narr-fade mt-3 border-l-2 border-white/25 pl-4 text-sm italic text-zinc-400 sm:text-base">
          &quot;확인 후 입금할게요.&quot;
        </blockquote>
        <blockquote className="narr-fade mt-3 border-l-2 border-white/25 pl-4 text-sm italic text-zinc-400 sm:text-base">
          &quot;다시 봐야 할 것 같습니다.&quot;
        </blockquote>
        <div className="narr-fade mt-10 border-t border-white/10 pt-10">
          <p className="text-sm text-zinc-500">문제는 계약서가 아니었습니다.</p>
          <h2
            className={`${DISPLAY} mt-2 text-[clamp(1.35rem,3.2vw,2.25rem)] font-normal leading-tight tracking-[-0.05em]`}
          >
            문제는 <span className="text-rose-400">증거</span>였습니다.
          </h2>
        </div>
        <p className="narr-fade mt-10 text-sm font-semibold text-zinc-500">
          왜 현장업은 항상 설명해야 할까?
          <span className="mt-2 block text-teal-400 motion-safe:animate-bounce" aria-hidden>
            ↓
          </span>
        </p>
      </section>

      {/* Story */}
      <section className="narr-fade rounded-[1.75rem] border border-zinc-200/60 bg-white px-5 py-12 sm:rounded-[2rem] sm:px-8 sm:py-14">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-teal-600">Founder story</p>
        <p
          className={`${DISPLAY} mt-2 text-[clamp(4rem,14vw,9rem)] leading-none tracking-[-0.06em] text-zinc-100`}
          aria-hidden
        >
          8
        </p>
        <h2
          className={`${DISPLAY} -mt-2 max-w-[20ch] text-[clamp(1.25rem,3.2vw,2rem)] font-normal leading-snug tracking-[-0.045em] text-zinc-900 sm:max-w-none`}
        >
          8년 넘게,
          <br />
          여러 번 사업을 정리하며 같은 문제를 겪었습니다.
        </h2>
        <div className="mt-8 max-w-2xl space-y-4 text-[0.9375rem] leading-relaxed text-zinc-600 sm:text-base">
          <p className="narr-fade">
            이 서비스를 함께 만드는 사람 중 한 명은{" "}
            <strong className="font-semibold text-zinc-900">8년가량 현장·운영을 병행했고</strong>, 그 과정에서
            사업을 여러 번 접은 경험이 있습니다.
          </p>
          <p className="narr-fade">그중 가장 많이 겪은 일은 — 일하고 돈 못 받는 상황이었습니다.</p>
          <p className="narr-fade">현장업은 일을 잘한다고 끝나는 구조가 아닙니다.</p>
          <div
            className={`narr-fade mt-8 rounded-2xl border-l-4 border-rose-400 bg-zinc-50 px-5 py-6 sm:px-6 ${DISPLAY} text-[clamp(1rem,2.5vw,1.5rem)] font-normal leading-snug tracking-[-0.03em] text-zinc-900`}
          >
            일 끝나고
            <br />
            설명하고 해명하고 사정해야 합니다.
            <br />
            <br />
            대표가 가장 힘든 순간은
            <br />
            일할 때가 아니라 <strong className="font-semibold">돈 받을 때</strong>입니다.
          </div>
        </div>
        <p className="narr-fade mt-10 text-sm font-semibold text-zinc-500">
          그래서 만들었습니다.
          <span className="mt-2 block text-teal-600 motion-safe:animate-bounce" aria-hidden>
            ↓
          </span>
        </p>
      </section>

      {/* Solution — 낮은 채도, 테두리·그라데이션 면 */}
      <section
        id="cleanidex-solution"
        className="narr-fade relative overflow-hidden rounded-[1.75rem] border border-teal-200/40 bg-gradient-to-br from-slate-50 via-sky-50/50 to-violet-50/40 px-5 py-12 sm:rounded-[2rem] sm:px-8 sm:py-14"
        aria-labelledby="cleanidex-solution-heading"
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-500 to-emerald-500"
          aria-hidden
        />
        <div className="relative pl-3 sm:pl-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-teal-700/90">Solution</p>
          <h2
            id="cleanidex-solution-heading"
            className={`${DISPLAY} mt-3 max-w-[16ch] text-[clamp(1.35rem,3.8vw,2.5rem)] font-normal leading-[1.1] tracking-[-0.04em] text-zinc-900 sm:max-w-none`}
          >
            클린아이덱스는
            <br />
            현장을 기록으로
            <br />
            남깁니다.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            작업이 끝났다는 게 아니라 — 증명 가능하게 만듭니다.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { Icon: Camera, name: "작업 전 사진" },
                { Icon: CheckSquare, name: "작업 후 사진" },
                { Icon: ClipboardList, name: "체크리스트" },
                { Icon: User, name: "고객 확인" },
                { Icon: PenLine, name: "전자서명" },
              ] as const
            ).map(({ Icon, name }) => (
              <div
                key={name}
                className="narr-fade flex items-start gap-3 rounded-xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm"
              >
                <Icon className="mt-0.5 h-6 w-6 shrink-0 text-teal-600" strokeWidth={1.75} aria-hidden />
                <span className="text-sm font-semibold text-zinc-900">{name}</span>
              </div>
            ))}
          </div>
          <p
            className={`${DISPLAY} narr-fade mt-10 text-[clamp(1rem,2.4vw,1.65rem)] leading-snug tracking-[-0.03em] text-zinc-500`}
          >
            &quot;일했다&quot;가 아니라
            <br />
            <strong className="font-normal text-zinc-900">&quot;증명 가능하게&quot;</strong> 만듭니다.
          </p>
        </div>
      </section>

      {/* Change */}
      <section className="narr-fade rounded-[1.75rem] border border-zinc-200/60 bg-white px-5 py-12 sm:rounded-[2rem] sm:px-8 sm:py-14">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-teal-600">Change</p>
        <h2
          className={`${DISPLAY} mt-4 max-w-[14ch] text-[clamp(1.2rem,3vw,1.85rem)] font-normal leading-snug tracking-[-0.035em] text-zinc-900 sm:max-w-none`}
        >
          이제 대표가
          <br />
          계속 설명하지
          <br />
          않아도 됩니다.
        </h2>
        <ul className="mt-10 divide-y divide-zinc-200">
          {(
            [
              {
                n: "01",
                t: "고객이 물어보면 기록을 보여주면 됩니다.",
                d: "카톡방에 흩어진 사진 말고, 한 곳에 정리된 완료 보고서",
              },
              {
                n: "02",
                t: "분쟁이 생기면 자료를 제출하면 됩니다.",
                d: "말로 싸울 필요 없이 — 타임스탬프 찍힌 현장 기록이 있습니다",
              },
              {
                n: "03",
                t: "직원이 일했는지는 현장을 보면 됩니다.",
                d: "체크리스트와 사진으로 작업 완료 여부 즉시 확인",
              },
            ] as const
          ).map(({ n, t, d }) => (
            <li key={n} className="narr-fade flex gap-4 py-6 first:pt-0">
              <span className={`${DISPLAY} w-12 shrink-0 text-3xl tracking-tight text-zinc-200`}>{n}</span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 sm:text-base">{t}</h3>
                <p className="mt-1 text-sm text-zinc-500">{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="narr-fade mt-10 rounded-2xl bg-zinc-900 px-6 py-8 text-white">
          <p className="text-xs text-zinc-500">감정노동을 시스템으로 바꾸는 것.</p>
          <p className={`${DISPLAY} mt-2 text-xl tracking-tight sm:text-2xl`}>
            그게 <span className="text-teal-400">클린아이덱스</span>입니다.
          </p>
        </div>
      </section>

      {/* Target + checklist */}
      <section className="narr-fade rounded-[1.75rem] border border-zinc-200/60 bg-zinc-50/80 px-5 py-12 sm:rounded-[2rem] sm:px-8 sm:py-14">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-teal-600">Who needs this</p>
        <h2
          className={`${DISPLAY} mt-4 text-[clamp(1.2rem,3vw,1.85rem)] font-normal leading-snug tracking-[-0.04em] text-zinc-900`}
        >
          이런 분들에게
          <br />
          필요합니다.
        </h2>
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {["청소업체", "시설관리", "무인매장 관리", "출장 서비스", "하도급 현장업"].map((tag) => (
            <div
              key={tag}
              className="narr-fade rounded-xl border border-zinc-200/80 bg-white py-3 text-center text-sm font-semibold text-zinc-800"
            >
              {tag}
            </div>
          ))}
        </div>
        <p className="narr-fade mt-8 max-w-xl text-sm leading-relaxed text-zinc-600">
          아래는 분위기용 체크예요. 해당되면 눌러 보세요 — <strong className="font-medium text-zinc-800">제출·저장은 되지 않습니다.</strong>
        </p>
        <div className="narr-fade mt-3" role="group" aria-label="경험 자가 점검 (로컬만)">
          {(
            [
              { key: "late-pay" as const, label: "일 끝나고 입금이 늦어진 적 있다" },
              { key: "claim-stress" as const, label: "고객 클레임 때문에 스트레스 받는다" },
              { key: "photos-scattered" as const, label: "사진이 카톡방에 흩어져 있다" },
              { key: "staff-verify" as const, label: "직원이 제대로 했는지 확인이 어렵다" },
            ] as const
          ).map(({ key, label }) => {
            const on = checked.has(key);
            return (
              <button
                key={key}
                type="button"
                className="flex w-full items-center gap-4 border-b border-zinc-200/90 py-4 text-left transition hover:bg-white/60"
                onClick={() => toggle(key)}
                aria-pressed={on}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold ${
                    on ? "border-teal-600 bg-teal-600 text-white" : "border-zinc-300 bg-white text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span
                  className={`text-sm sm:text-base ${on ? "text-teal-700 line-through decoration-teal-200" : "font-medium text-zinc-800"}`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className={`narr-fade mt-6 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-5 text-white shadow-lg transition duration-500 ${
            anyChecked ? "scale-100 opacity-100" : "pointer-events-none scale-[0.98] opacity-0"
          }`}
          aria-live="polite"
          aria-hidden={!anyChecked}
        >
          <p className={`${DISPLAY} text-[clamp(1rem,2.5vw,1.5rem)] leading-snug`}>
            하나라도 해당된다면
            <br />
            클린아이덱스가 필요합니다.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="narr-fade rounded-[1.75rem] border border-zinc-200/60 bg-white px-5 py-12 sm:rounded-[2rem] sm:px-8 sm:py-14">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-teal-600">Features</p>
        <h2
          className={`${DISPLAY} mt-4 text-[clamp(1.15rem,2.8vw,1.65rem)] font-normal leading-snug tracking-[-0.03em] text-zinc-900`}
        >
          현재 준비 중인
          <br />
          기능들
        </h2>
        <p className="mt-3 text-sm text-zinc-600 sm:text-base">계약서는 시작입니다. 진짜 중요한 건 완료 증거입니다.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="narr-fade rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-5 shadow-sm"
            >
              <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-teal-600">{f.label}</p>
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="narr-fade mt-10 rounded-2xl bg-zinc-900 px-6 py-8 text-center text-white">
          <p className="text-sm text-zinc-500">계약서는 시작입니다.</p>
          <p className={`${DISPLAY} mt-2 text-lg tracking-tight sm:text-xl`}>
            진짜 중요한 건 <span className="text-teal-400">완료 증거</span>입니다.
          </p>
        </div>
      </section>

      {/* CTA — 신청 폼 없음 */}
      <section
        id="cleanidex-cta"
        className="narr-fade rounded-[1.75rem] border border-zinc-800/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-slate-900 px-5 py-14 text-center text-white sm:rounded-[2rem] sm:py-16"
        aria-labelledby="cleanidex-cta-heading"
      >
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-teal-500/90">
          {HOME_CLEAN_INDEX_BETA.status}
        </p>
        <h2
          id="cleanidex-cta-heading"
          className={`${DISPLAY} mt-4 text-[clamp(1.75rem,5vw,3rem)] font-normal leading-[1.08] tracking-[-0.05em]`}
        >
          <span className="text-zinc-600">일하고도</span>
          <br />
          <span className="text-zinc-600">돈 못 받는 구조를</span>
          <br />
          <span className="text-white">끝냅니다.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm text-zinc-500">{HOME_CLEAN_INDEX_BETA.ctaBody}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/beta"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
          >
            {HOME_CLEAN_INDEX_BETA.ctaPrimary}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-600 px-7 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            로그인
          </Link>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className={`${DISPLAY} text-lg text-zinc-600`}>
            클린<span className="text-teal-400">아이덱스</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">현장업의 완료 증거 시스템</p>
        </div>
      </section>
    </article>
  );
}
