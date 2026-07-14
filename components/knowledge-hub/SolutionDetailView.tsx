import Link from "next/link";
import type { AssembledSolution } from "@/lib/knowledge-hub/solutions/get-solutions";
import { getSolutionPath } from "@/lib/knowledge-hub/solutions/get-solutions";
import type { SolutionStarRating } from "@/lib/knowledge-hub/solutions/types";

type Props = {
  data: AssembledSolution;
};

function Rating({ value, label }: { value: SolutionStarRating; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-label={`${label} ${value}점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-[1.5rem] leading-none ${i < value ? "text-amber-400" : "text-stone-300"}`}
          aria-hidden
        >
          ★
        </span>
      ))}
      <span className="ml-1.5 text-base font-bold text-stone-900">{value}/5</span>
    </span>
  );
}

function SectionTitle({
  id,
  children,
  tone = "default",
}: {
  id: string;
  children: string;
  tone?: "default" | "danger";
}) {
  return (
    <h2
      id={id}
      className={`text-[1.35rem] font-black leading-snug tracking-tight sm:text-2xl ${
        tone === "danger" ? "text-red-700" : "text-orange-700"
      }`}
    >
      {children}
    </h2>
  );
}

export default function SolutionDetailView({ data }: Props) {
  const {
    page,
    placeLabel,
    spaceLabel,
    partLabel,
    siblings,
    content,
  } = data;

  return (
    <article
      className="mx-auto max-w-lg text-stone-900"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      <meta itemProp="name" content={page.title} />

      <nav className="text-base text-stone-700" aria-label="경로">
        <Link href="/solutions" className="font-semibold text-teal-900 hover:underline">
          검색어 가이드
        </Link>
      </nav>

      <div className="mt-5 flex flex-wrap gap-2">
        {[placeLabel, spaceLabel, partLabel].filter(Boolean).map((label) => (
          <span
            key={label}
            className="rounded-full bg-stone-200/90 px-3 py-1 text-[15px] font-bold text-stone-900"
          >
            {label}
          </span>
        ))}
      </div>
      <h1 className="mt-4 text-[1.85rem] font-black leading-[1.3] tracking-tight text-stone-950 sm:text-[2.15rem]">
        {page.title}
      </h1>

      <section className="mt-8" aria-labelledby="summary-h">
        <SectionTitle id="summary-h">한줄로 보면</SectionTitle>
        <p
          className="mt-3 rounded-3xl bg-[#d7ebe7] px-4 py-3.5 text-lg font-semibold leading-[1.65] text-stone-950 sm:text-xl"
          itemProp="description"
        >
          {content.summary}
        </p>
      </section>

      <section className="mt-14" aria-labelledby="info-h">
        <SectionTitle id="info-h">이런 오염이에요</SectionTitle>
        <div className="mt-3 space-y-0 rounded-2xl bg-white px-4 py-1 ring-1 ring-stone-300">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 py-3">
            <span className="text-base font-semibold text-stone-700">종류</span>
            <span className="text-lg font-bold text-stone-950">{content.contaminantTypeLabel}</span>
          </div>
          {content.difficulty ? (
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 py-3">
              <span className="text-base font-semibold text-stone-700">난이도</span>
              <Rating value={content.difficulty} label="난이도" />
            </div>
          ) : null}
          {content.locations.length ? (
            <div className="py-3">
              <p className="text-base font-semibold text-stone-700">잘 생기는 곳</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {content.locations.map((loc) => (
                  <li
                    key={loc}
                    className="rounded-full bg-stone-200/80 px-3 py-1.5 text-[15px] font-bold text-stone-900"
                  >
                    {loc}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {content.recommendations.length ? (
        <section className="mt-14" aria-labelledby="detergents-h">
          <SectionTitle id="detergents-h">이 세제를 써보세요</SectionTitle>
          <ol className="mt-3 space-y-2">
            {content.recommendations.map((r, i) => {
              const top = i === 0;
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold leading-snug ${
                        top ? "text-[1.2rem] text-stone-950" : "text-lg text-stone-950"
                      }`}
                    >
                      {r.label}
                    </p>
                    {top ? (
                      <p className="mt-0.5 text-sm font-bold text-teal-900">제일 잘 맞아요</p>
                    ) : null}
                  </div>
                  <Rating value={r.rating} label={r.label} />
                </>
              );
              const className = `flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition ${
                top
                  ? "bg-[#d7ebe7] ring-1 ring-teal-900/25"
                  : "bg-white ring-1 ring-stone-300 hover:ring-teal-900/30"
              }`;
              return (
                <li key={`${r.label}-${r.rating}`}>
                  {r.href ? (
                    <Link href={r.href} className={className}>
                      {body}
                    </Link>
                  ) : (
                    <div className={className}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {content.methodSteps.length ? (
        <section className="mt-14" aria-labelledby="method-h">
          <SectionTitle id="method-h">이렇게 하세요</SectionTitle>
          <ol className="mt-3 space-y-2">
            {content.methodSteps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-stone-300"
                itemProp="step"
                itemScope
                itemType="https://schema.org/HowToStep"
              >
                <meta itemProp="position" content={String(i + 1)} />
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-base font-bold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p
                  className="min-w-0 flex-1 pt-1 text-lg font-medium leading-[1.55] text-stone-950"
                  itemProp="text"
                >
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.cautions.length ? (
        <section className="mt-14" aria-labelledby="cautions-h">
          <SectionTitle id="cautions-h" tone="danger">
            꼭 기억해 주세요
          </SectionTitle>
          <ul className="mt-3 space-y-2 rounded-2xl bg-[#f3ebe0] px-4 py-3.5 ring-1 ring-stone-300">
            {content.cautions.map((c) => (
              <li key={c} className="flex gap-2.5 text-lg leading-snug text-stone-950">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-stone-700" aria-hidden />
                <span className="font-semibold">{c}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.ifFails.length ? (
        <section className="mt-14" aria-labelledby="if-fails-h">
          <SectionTitle id="if-fails-h">그래도 안 지워진다면?</SectionTitle>
          <p className="mt-2 text-base font-medium leading-relaxed text-stone-700">
            요석이 아닐 수도 있어요. 아래를 한번 확인해 보세요.
          </p>
          <ul className="mt-3 space-y-2">
            {content.ifFails.map((item) => (
              <li
                key={item}
                className="rounded-2xl bg-white px-3.5 py-3 text-lg font-bold text-stone-950 ring-1 ring-stone-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="siblings-h">
        <SectionTitle id="siblings-h">{`같은 ${partLabel}, 다른 오염`}</SectionTitle>
        {siblings.length ? (
          <ul className="mt-3 space-y-2">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link
                  href={getSolutionPath(s)}
                  className="block rounded-2xl bg-white px-3.5 py-3 text-base font-bold text-stone-950 ring-1 ring-stone-300 transition hover:bg-[#d7ebe7] hover:ring-teal-900/25 sm:text-lg"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-base text-stone-600">아직 등록된 다른 오염이 없어요.</p>
        )}
        <Link
          href="/solutions"
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-teal-900 px-4 py-3.5 text-lg font-bold text-white transition hover:bg-teal-800"
        >
          전체 보기로 이동
        </Link>
      </section>
    </article>
  );
}
