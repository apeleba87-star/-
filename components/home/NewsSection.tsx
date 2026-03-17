"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import {
  homeCardClass,
  homeFooterBtnClass,
  homeSectionIconBox,
  homeSectionSpacing,
} from "./home-section-styles";

type Post = {
  id: string;
  title: string;
  published_at: string | null;
};

type Props = { posts: Post[]; isLoggedIn?: boolean };

export default function NewsSection({ posts, isLoggedIn = true }: Props) {
  const blind = !isLoggedIn;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={homeSectionSpacing}
    >
      <div className={`${homeSectionIconBox} bg-violet-500`}>
        <Newspaper className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">업계 소식</h2>
      <p className="mt-0.5 text-xs text-slate-500">청소업 관련 뉴스·이슈 요약</p>

      {blind ? (
        <div className={`${homeCardClass} mt-4 rounded-2xl p-6 text-center`}>
          <p className="text-sm text-slate-500">로그인 후 업계 소식을 확인하세요.</p>
          <Link
            href="/login?next=/news"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-600"
          >
            로그인하기
          </Link>
        </div>
      ) : posts.length === 0 ? (
        <div className={`${homeCardClass} mt-4 rounded-2xl p-6 text-center`}>
          <p className="text-sm text-slate-500">등록된 업계 소식이 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/posts/${p.id}`} className="block">
                <div className={`${homeCardClass} flex min-h-[52px] items-center justify-between gap-2`}>
                  <span className="min-w-0 flex-1 font-medium text-slate-800 line-clamp-2">{p.title}</span>
                  {p.published_at && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(p.published_at).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={blind ? "/login?next=/news" : "/categories/industry"} className={`${homeFooterBtnClass} block`}>
        {blind ? "로그인 후 전체 보기" : "전체 보기"}
      </Link>
    </motion.section>
  );
}
