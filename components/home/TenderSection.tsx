"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

function dday(clseDt: string | null): string {
  if (!clseDt) return "—";
  const end = new Date(clseDt).getTime();
  const day = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

type Tender = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  bsns_dstr_nm: string | null;
};

type Props = { tenders: Tender[]; relatedCount: number; todayCount: number };

export default function TenderSection({ tenders, relatedCount, todayCount }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-10"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow">
        <FileText className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">청소·방역·소독 입찰</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        관련건수 {relatedCount}건 · 오늘 공고 {todayCount}건
      </p>

      {tenders.length === 0 ? (
        <motion.div
          className={`${glass} mt-4 flex flex-col items-center justify-center rounded-2xl p-8`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <FileText className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">현재 접수 중인 청소·방역·소독 입찰 공고가 없습니다.</p>
        </motion.div>
      ) : (
        <ul className="mt-4 space-y-3">
          {tenders.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link href={`/tenders/${t.id}`} className="block touch-manipulation">
                <motion.div
                  className={`${glass} flex min-h-[72px] flex-col justify-center rounded-2xl p-4 sm:min-h-0`}
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-medium text-slate-900 line-clamp-2">{t.bid_ntce_nm || "(제목 없음)"}</span>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                    <span>발주 : {t.ntce_instt_nm || "—"}</span>
                    {t.bsns_dstr_nm && <span>{t.bsns_dstr_nm}</span>}
                    <span className="font-medium text-red-600">마감 : {dday(t.bid_clse_dt)}</span>
                  </div>
                </motion.div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Link href="/tenders?category=both" className="mt-4 block touch-manipulation">
        <motion.span
          className={`${glass} flex min-h-[48px] w-full items-center justify-center rounded-2xl py-3.5 text-sm font-medium text-slate-700`}
          whileHover={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.9) 0%, rgba(124,58,237,0.9) 100%)",
            color: "white",
          }}
          whileTap={{ scale: 0.98 }}
        >
          전체 공고 보기
        </motion.span>
      </Link>
    </motion.section>
  );
}
