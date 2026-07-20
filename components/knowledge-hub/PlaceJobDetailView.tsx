import Link from "next/link";
import type { ReactNode } from "react";
import type { PlaceJob } from "@/lib/knowledge-hub/place-jobs/types";
import { getPlaceLabel } from "@/lib/knowledge-hub/solutions/taxonomy";
import { summaryWithPlaceJob } from "@/lib/knowledge-hub/place-jobs/shared";

type Props = { job: PlaceJob };

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-black text-stone-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function PlaceJobDetailView({ job }: Props) {
  const placeLabel = getPlaceLabel(job.placeId);
  const summary = job.summary
    ? summaryWithPlaceJob(job.summary, placeLabel)
    : undefined;

  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-sm font-bold text-teal-800">
        <Link href="/places" className="hover:underline">
          장소별 청소 방법
        </Link>
        <span className="mx-1.5 text-stone-300">/</span>
        {placeLabel}
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">{job.title}</h1>

      {summary ? (
        <section className="mt-8" aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-xl font-black text-stone-900">
            한줄로 보면
          </h2>
          <p className="mt-3 rounded-2xl bg-[#d7ebe7] px-4 py-3.5 text-lg font-bold leading-snug text-stone-950 ring-1 ring-teal-900/20">
            {summary}
          </p>
        </section>
      ) : null}

      {job.prepare.length ? (
        <Section id="prep" title="준비">
          <ul className="space-y-2">
            {job.prepare.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] font-medium text-stone-900"
              >
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {job.steps.length ? (
        <Section id="steps" title="순서">
          <ol className="space-y-2">
            {job.steps.map((line, i) => (
              <li
                key={`${i}-${line}`}
                className="flex gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-black text-white">
                  {i + 1}
                </span>
                <span className="text-[15px] font-medium text-stone-900">{line}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {job.motions.length ? (
        <Section id="motions" title="동작·팁">
          <ul className="space-y-2">
            {job.motions.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-[15px] font-medium text-stone-900"
              >
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {job.checklist.length ? (
        <Section id="check" title="마감 체크">
          <ul className="space-y-2">
            {job.checklist.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] font-bold text-stone-900"
              >
                ☐ {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {job.frequency ? (
        <Section id="freq" title="주기">
          <p className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] font-medium text-stone-900">
            {job.frequency}
          </p>
        </Section>
      ) : null}

      {job.cautions.length ? (
        <Section id="cautions" title="주의">
          <ul className="space-y-2">
            {job.cautions.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-2.5 text-[15px] font-bold text-red-900"
              >
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {(job.pollutionLinks?.length || job.relatedServicePath) && (
        <Section id="links" title="더 보기">
          <ul className="space-y-2">
            {job.pollutionLinks?.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-xl border border-teal-200 bg-teal-50/50 px-3.5 py-2.5 text-sm font-bold text-teal-900 hover:bg-teal-50"
                >
                  {l.label} →
                </Link>
              </li>
            ))}
            {job.relatedServicePath ? (
              <li>
                <Link
                  href={job.relatedServicePath}
                  className="block rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-800 hover:border-teal-300"
                >
                  기존 상세 가이드 →
                </Link>
              </li>
            ) : null}
          </ul>
        </Section>
      )}
    </article>
  );
}
