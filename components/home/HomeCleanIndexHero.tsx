import Link from "next/link";
import { ChevronRight, ChevronsDown } from "lucide-react";
import { formatBudgetEokManWon, formatMoneyMan } from "@/lib/tender-utils";
import { HOME_CLEAN_INDEX } from "@/lib/copy/home-clean-index";
import type { HomeSpotlightTender } from "@/lib/home/home-spotlight";
import HomeReportTeaserButton from "./HomeReportTeaserButton";

type Props = {
  tender: HomeSpotlightTender | null;
  syncedLabel: string;
  isLoggedIn: boolean;
};

export default function HomeCleanIndexHero({ tender, syncedLabel, isLoggedIn }: Props) {
  const amountHero = formatBudgetEokManWon(tender?.amountWon ?? null);
  const amountLine =
    tender?.amountWon != null ? formatMoneyMan(tender.amountWon) : "금액 확인 중";
  const title = tender?.title ?? "등록 업종에 맞는 진행 중 공고를 불러오는 중입니다";
  const region = tender?.regionLabel ?? "—";
  const ddayLabel = tender?.ddayLabel ?? "—";

  const detailHref = tender
    ? isLoggedIn
      ? `/tenders/${tender.id}`
      : `/login?next=${encodeURIComponent(`/tenders/${tender.id}`)}`
    : isLoggedIn
      ? "/tenders"
      : "/login?next=%2Ftenders";

  return (
    <section
      id="hero"
      className="relative mb-6 scroll-mt-20 overflow-hidden rounded-[1.75rem] border border-zinc-200/60 bg-white shadow-[0_24px_48px_-28px_rgba(24,24,27,0.18)] sm:mb-7 sm:scroll-mt-24 sm:rounded-[2rem]"
      aria-labelledby="home-hero-slogan home-tender-hero-amount"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white to-violet-100/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-t from-fuchsia-200/25 via-violet-200/20 to-transparent blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-blue-400/[0.06] blur-3xl"
        aria-hidden
      />

      <div className="relative z-[1] px-6 pb-10 pt-8 text-center sm:px-10 sm:pb-12 sm:pt-10">
        <div className="mb-7 flex flex-col items-stretch gap-4 sm:mb-9 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p
            id="home-hero-slogan"
            className="mx-auto max-w-xl text-pretty text-[0.9375rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-800 sm:mx-0 sm:max-w-[28rem] sm:flex-1 sm:text-left sm:text-[1.0625rem]"
          >
            <span className="text-zinc-900">{HOME_CLEAN_INDEX.sloganLead}</span>
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              {HOME_CLEAN_INDEX.sloganHighlight}
            </span>
            <span className="text-zinc-600">{HOME_CLEAN_INDEX.sloganBrand}</span>
          </p>
          <span
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-2 text-[0.6875rem] font-medium text-zinc-600 tabular-nums shadow-sm backdrop-blur-sm sm:self-start sm:justify-end"
            title={HOME_CLEAN_INDEX.tenderSourceNote}
          >
            <span
              className="h-1 w-1 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]"
              aria-hidden
            />
            {syncedLabel}
          </span>
        </div>

        <p className="mx-auto max-w-lg text-lg font-bold leading-snug tracking-[-0.02em] text-zinc-900 sm:text-xl">
          {HOME_CLEAN_INDEX.protagonistQuestion}
        </p>

        <p
          id="home-tender-hero-amount"
          className="mx-auto mt-6 flex w-full max-w-full justify-center px-0 font-bold max-sm:-mx-1 sm:mt-7 sm:mx-auto"
        >
          <span
            className="inline-block max-w-full overflow-x-auto whitespace-nowrap bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text font-mono text-transparent tabular-nums [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-sm:leading-[1.02] max-sm:tracking-[-0.06em] max-sm:text-[clamp(1.2rem,min(3rem,11.2vw+0.6rem),3rem)] sm:leading-[1.06] sm:tracking-[-0.04em] sm:text-[clamp(2.5rem,5.6vw,4.35rem)]"
          >
            {amountHero}
          </span>
        </p>

        <p className="mt-4 text-base font-medium text-zinc-500 sm:text-[1.0625rem]">{HOME_CLEAN_INDEX.tenderHeroLabel}</p>

        <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:gap-4">
          <span className="line-clamp-2 text-center text-[0.9375rem] leading-snug text-zinc-800 sm:text-left sm:text-base">
            {title}
          </span>
          <span className="hidden h-5 w-px shrink-0 bg-zinc-200 sm:block" aria-hidden />
          <span
            className="inline-flex shrink-0 items-center rounded-lg border border-orange-200/90 bg-orange-50/95 px-3 py-1.5 text-[0.75rem] font-semibold tabular-nums text-orange-950 shadow-sm sm:text-[0.8125rem]"
            title="입찰 마감까지 남은 일수"
          >
            {ddayLabel}
          </span>
        </div>

        <div className="mx-auto mt-9 w-full max-w-md">
          <HomeReportTeaserButton
            variant="block"
            isLoggedIn={isLoggedIn}
            tenderTitle={title}
            amountLine={amountLine}
            regionLine={region}
            ddayLine={ddayLabel}
          />
        </div>

        <Link
          href={detailHref}
          className="group mt-5 inline-flex items-center gap-1.5 text-base font-medium text-zinc-500 underline-offset-4 transition hover:text-zinc-800"
        >
          공고 상세 보기
          <ChevronRight
            className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-600"
            strokeWidth={2}
            aria-hidden
          />
        </Link>

        <div className="mt-10 flex flex-col items-center gap-1 text-zinc-300" aria-hidden>
          <ChevronsDown className="h-7 w-7 animate-bounce" strokeWidth={1.5} />
        </div>

        <p className="sr-only">
          {HOME_CLEAN_INDEX.reportCtaSub}. {HOME_CLEAN_INDEX.tenderScopeNote}. {HOME_CLEAN_INDEX.tenderSourceNote}. 지역{" "}
          {region}.
        </p>
        <span className="sr-only">{HOME_CLEAN_INDEX.tagline}</span>
      </div>
    </section>
  );
}
