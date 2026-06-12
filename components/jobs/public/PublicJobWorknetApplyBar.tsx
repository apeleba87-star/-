import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";

type Props = {
  href: string;
};

/** 상세 페이지 — 고용24 지원 CTA (모바일 하단 고정) */
export default function PublicJobWorknetApplyBar({ href }: Props) {
  return (
    <>
      <section className="mt-6 hidden md:block">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-blue-800 px-6 text-lg font-bold text-white shadow-sm hover:bg-blue-900"
        >
          {PUBLIC_JOBS_COPY.externalCta}
        </a>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="지원하기"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-blue-800 px-6 text-lg font-bold text-white active:bg-blue-900"
        >
          {PUBLIC_JOBS_COPY.externalCta}
        </a>
      </div>
      <div className="h-[4.5rem] md:hidden" aria-hidden />
    </>
  );
}
