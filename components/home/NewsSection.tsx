"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import {
  homeCardClass,
  homeFooterBtnPrimaryClass,
  homeSectionIconGradientBox,
  homeSectionSpacing,
  homeSurfaceCardClass,
  homeSurfaceCardInnerClass,
} from "./home-section-styles";

type Post = {
  id: string;
  title: string;
  published_at: string | null;
};

type Props = { posts: Post[]; isLoggedIn?: boolean; sectionId?: string };

export default function NewsSection({ posts, isLoggedIn = true, sectionId = "news" }: Props) {
  const blind = !isLoggedIn;

  return (
    <motion.section
      id={sectionId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`${homeSectionSpacing} scroll-mt-20 sm:scroll-mt-24`}
    >
      <div className={`${homeSurfaceCardClass} overflow-hidden`}>
        <div className={`${homeSurfaceCardInnerClass} px-6 py-8 sm:px-8 sm:py-10`}>
          <header className="mb-6 text-center sm:mb-8">
            <div className={`${homeSectionIconGradientBox} mx-auto`}>
              <Newspaper className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">데이터랩</h2>
            <p className="mt-0.5 text-xs text-zinc-500">청소업 리포트·뉴스·이슈 요약</p>
          </header>

          {posts.length === 0 ? (
            <div className={`${homeCardClass} rounded-2xl p-6 text-center`}>
              <p className="text-sm text-zinc-500">등록된 글이 없습니다.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={blind ? `/login?next=${encodeURIComponent(`/posts/${p.id}`)}` : `/posts/${p.id}`}
                    className="group block"
                  >
                    <div
                      className={`${homeCardClass} flex min-h-[52px] items-center justify-between gap-2 transition group-hover:border-violet-200/80`}
                    >
                      <span className="min-w-0 flex-1 font-medium text-zinc-800 line-clamp-2 group-hover:text-violet-700">
                        {p.title}
                      </span>
                      {p.published_at && (
                        <span className="shrink-0 text-xs text-zinc-400">
                          {new Date(p.published_at).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href={blind ? "/news" : "/categories/industry"} className={`${homeFooterBtnPrimaryClass} block`}>
            전체 보기
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
