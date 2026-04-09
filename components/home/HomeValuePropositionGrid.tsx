"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Briefcase,
  UserPlus,
  Calculator,
  ChevronRight,
  Rss,
  BarChart3,
} from "lucide-react";
import { HOME_VALUE_CARDS } from "@/lib/copy/home-landing";

const iconMap = {
  trending: TrendingUp,
  rss: Rss,
  chart: BarChart3,
  briefcase: Briefcase,
  userplus: UserPlus,
  calculator: Calculator,
} as const;

type Props = {
  isLoggedIn: boolean;
};

export default function HomeValuePropositionGrid({ isLoggedIn }: Props) {
  const withNext = (path: string) => (isLoggedIn ? path : `/login?next=${encodeURIComponent(path)}`);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {HOME_VALUE_CARDS.map((card, i) => {
        const Icon = iconMap[card.icon as keyof typeof iconMap];
        const disabled = "disabled" in card && card.disabled === true;
        const cardClass =
          "flex h-full flex-col rounded-2xl border p-5 shadow-sm ring-1 ring-zinc-950/[0.03] transition-all " +
          (disabled
            ? "cursor-not-allowed border-zinc-200/60 bg-zinc-50/80 opacity-[0.92]"
            : "group border-zinc-200/70 bg-white hover:border-violet-200/80 hover:shadow-md");

        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span
                className={
                  disabled
                    ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200/90 text-zinc-500"
                    : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20"
                }
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              {!disabled && (
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </div>
            <h3 className="mt-3 font-semibold text-zinc-900">
              {card.title}{" "}
              {disabled ? <span className="text-sm font-normal text-zinc-400">(준비중)</span> : null}
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600">{card.description}</p>
            {disabled ? (
              <span className="mt-4 text-sm font-medium text-zinc-400">곧 제공 예정</span>
            ) : (
              <span className="mt-4 text-sm font-medium text-violet-700 group-hover:underline">이동하기</span>
            )}
          </>
        );

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 * i }}
          >
            {disabled ? (
              <div className={cardClass} aria-disabled="true">
                {body}
              </div>
            ) : (
              <Link href={withNext(card.href)} className={cardClass}>
                {body}
              </Link>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
