import type { ReactNode } from "react";
import { homeSurfaceCardClass, homeSurfaceCardInnerClass } from "./home-section-styles";

type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
};

/**
 * 홈 랜딩 블록 — 히어로와 동일한 흰 카드 셸로 감쌈
 */
export default function HomeLandingSection({
  id,
  title,
  subtitle,
  children,
  className = "",
  headerClassName = "mb-6 sm:mb-8",
}: Props) {
  return (
    <section id={id} className={`scroll-mt-20 sm:scroll-mt-24 ${className}`}>
      <div className={`${homeSurfaceCardClass} overflow-hidden`}>
        <div className={`${homeSurfaceCardInnerClass} px-6 py-8 text-center sm:px-8 sm:py-10`}>
          <header className={headerClassName}>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.65rem]">{title}</h2>
            {subtitle ? (
              <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}
