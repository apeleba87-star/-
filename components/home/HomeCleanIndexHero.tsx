import { HOME_CLEAN_INDEX } from "@/lib/copy/home-clean-index";
import type { HomeSpotlightTender } from "@/lib/home/home-spotlight";

type Props = {
  tender: HomeSpotlightTender | null;
  syncedLabel: string;
  isLoggedIn: boolean;
};

/**
 * 홈 흰 카드 히어로: 상단 카피만 노출(“청소업의 모든 기회”까지).
 * 입찰 스포트라이트·CTA는 상단 내러티브·아래 섹션에서 다룸.
 */
export default function HomeCleanIndexHero({
  tender: _tender,
  syncedLabel: _syncedLabel,
  isLoggedIn: _isLoggedIn,
}: Props) {
  return (
    <section
      id="hero"
      className="relative mb-6 scroll-mt-20 overflow-hidden rounded-[1.75rem] border border-zinc-200/60 bg-white shadow-[0_24px_48px_-28px_rgba(24,24,27,0.18)] sm:mb-7 sm:scroll-mt-24 sm:rounded-[2rem]"
      aria-labelledby="home-hero-slogan"
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

      <div className="relative z-[1] px-6 pb-8 pt-8 text-center sm:px-10 sm:pb-10 sm:pt-10">
        <p
          id="home-hero-slogan"
          className="mx-auto max-w-xl text-pretty text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-900 sm:text-[1.1875rem]"
        >
          {HOME_CLEAN_INDEX.heroHeadline}
        </p>
        <p className="sr-only">{HOME_CLEAN_INDEX.tagline}</p>
      </div>
    </section>
  );
}
