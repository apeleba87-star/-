"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Newspaper, ArrowRight } from "lucide-react";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

type Post = {
  id: string;
  title: string;
  published_at: string | null;
};

export default function NewsSection({ posts }: { posts: Post[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="mb-10"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow">
        <Newspaper className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">업계 뉴스</h2>
      <p className="mt-0.5 text-sm text-slate-600">청소업 관련 뉴스·이슈 요약</p>

      {posts.length === 0 ? (
        <motion.div
          className={`${glass} mt-4 rounded-2xl p-6 text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-slate-500">등록된 업계 소식이 없습니다.</p>
          <Link href="/categories" className="mt-2 inline-block text-sm text-blue-600 hover:text-purple-600 hover:underline">
            카테고리 보기
          </Link>
        </motion.div>
      ) : (
        <ul className="mt-4 space-y-2">
          {posts.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <Link href={`/posts/${p.id}`} className="block touch-manipulation">
                <motion.div
                  className={`${glass} flex min-h-[52px] items-center justify-between gap-2 rounded-2xl px-4 py-3 sm:min-h-0`}
                  whileHover={{ scale: 1.01, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="min-w-0 flex-1 font-medium text-slate-800 line-clamp-2">{p.title}</span>
                  {p.published_at && (
                    <span className="shrink-0 text-xs text-slate-400">{new Date(p.published_at).toLocaleDateString("ko-KR")}</span>
                  )}
                </motion.div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Link href="/categories" className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-blue-600 hover:text-purple-600 touch-manipulation">
        <span>카테고리 전체 보기</span>
        <motion.span whileHover={{ x: 4 }}>
          <ArrowRight className="h-4 w-4" />
        </motion.span>
      </Link>
    </motion.section>
  );
}
