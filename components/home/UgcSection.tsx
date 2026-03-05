"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

type Ugc = {
  id: string;
  type: string;
  scope: string | null;
  comment: string | null;
  region: string | null;
  price_per_pyeong: number | null;
};

function ugcTitle(u: Ugc): string {
  if (u.scope?.trim()) return u.scope;
  if (u.comment?.trim()) return u.comment.slice(0, 40) + (u.comment.length > 40 ? "…" : "");
  return u.type === "field" ? "현장 후기" : "후기";
}

export default function UgcSection({ items }: { items: Ugc[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-10"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow">
        <MapPin className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">현장 공유</h2>
      <p className="mt-0.5 text-sm text-slate-600">사용자들이 작성한 청소 현장 경험</p>

      {items.length === 0 ? (
        <motion.div
          className={`${glass} mt-4 flex flex-col items-center justify-center rounded-2xl p-8`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Star className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">등록된 현장 경험이 없습니다.</p>
          <Link href="/ugc/new" className="mt-2 text-sm text-cyan-600 hover:underline">첫 글 쓰기</Link>
        </motion.div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((u, i) => (
            <motion.li key={u.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <Link href={`/ugc/${u.id}`} className="block touch-manipulation">
                <motion.div
                  className={`${glass} min-h-[52px] rounded-2xl px-4 py-3 sm:min-h-0`}
                  whileHover={{ scale: 1.01, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="font-medium text-slate-800">{ugcTitle(u)}</span>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
                    {u.region && <span>{u.region}</span>}
                    {u.price_per_pyeong != null && <span>평당 {Number(u.price_per_pyeong).toLocaleString()}원</span>}
                  </div>
                </motion.div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Link href="/ugc" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 hover:text-cyan-600 touch-manipulation">
        현장·후기 전체 보기 →
      </Link>
    </motion.section>
  );
}
