import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HOME_LANDING } from "@/lib/copy/home-landing";
import { homeSurfaceCardClass, homeSurfaceCardInnerClass } from "./home-section-styles";

type Props = {
  isLoggedIn: boolean;
};

const primaryBtnClass =
  "inline-flex min-h-[48px] flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 sm:min-h-[52px]";

const secondaryBtnClass =
  "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:border-violet-200/80 hover:bg-zinc-50 sm:w-auto sm:flex-initial";

export default function HomeBottomCta({ isLoggedIn }: Props) {
  const tendersHref = isLoggedIn ? "/tenders?category=both" : "/login?next=%2Ftenders%3Fcategory%3Dboth";
  const newsHref = isLoggedIn ? "/news" : "/login?next=%2Fnews";
  const secondaryHref = isLoggedIn ? "/mypage" : "/login";
  const secondaryLabel = isLoggedIn ? "마이페이지" : HOME_LANDING.bottomSecondary;

  return (
    <section
      className={`${homeSurfaceCardClass} relative overflow-hidden`}
      aria-labelledby="home-bottom-cta-title"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-400/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-500/[0.1] blur-3xl"
        aria-hidden
      />

      <div className={`${homeSurfaceCardInnerClass} relative px-6 py-10 text-center sm:px-10 sm:py-12`}>
        <h2 id="home-bottom-cta-title" className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {HOME_LANDING.bottomTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{HOME_LANDING.bottomSubtitle}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link href={tendersHref} className={primaryBtnClass}>
            {HOME_LANDING.bottomPrimary}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
          <Link href={secondaryHref} className={secondaryBtnClass}>
            {secondaryLabel}
          </Link>
          <Link
            href={newsHref}
            className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-zinc-500 underline-offset-4 transition hover:text-violet-600 hover:underline sm:min-h-0"
          >
            {HOME_LANDING.bottomTertiary}
          </Link>
        </div>
      </div>
    </section>
  );
}
