"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Trophy, ArrowRight } from "lucide-react";
import { formatMoney, formatMoneyMan, formatDate } from "@/lib/tender-utils";

export type TenderAwardListRow = {
  id: string;
  tender_id: string | null;
  bid_ntce_no: string;
  bid_ntce_ord: string;
  bid_ntce_nm: string | null;
  openg_dt: string | null;
  sucsfbider_nm: string | null;
  sucsfbid_amt: number | string | null;
  presmpt_prce: number | string | null;
  bid_rate_pct: number | string | null;
  competition_summary: string | null;
  rate_band: string | null;
  is_clean_related: boolean;
};

function moneyOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pad3(v: string): string {
  const s = String(v ?? "0").replace(/\D/g, "") || "0";
  return s.padStart(3, "0");
}

function tenderNumber(row: TenderAwardListRow): string {
  return `${row.bid_ntce_no}-${pad3(row.bid_ntce_ord)}`;
}

function rateBandBadge(band: string | null): { label: string; className: string } | null {
  if (!band) return null;
  if (band === "under_85") {
    return { label: "낙찰률 낮음", className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
  if (band === "85_95") {
    return { label: "낙찰률 중간", className: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  if (band === "over_95") {
    return { label: "낙찰률 높음", className: "bg-rose-50 text-rose-900 border-rose-200" };
  }
  return null;
}

export default function TenderAwardListCard({ row }: { row: TenderAwardListRow }) {
  const [copied, setCopied] = useState(false);
  const badge = rateBandBadge(row.rate_band);
  const pct = pctOrNull(row.bid_rate_pct);
  const awardAmt = moneyOrNull(row.sucsfbid_amt);
  const presmpt = moneyOrNull(row.presmpt_prce);
  const detailHref = row.tender_id ? `/tenders/${row.tender_id}` : null;
  const noticeNo = tenderNumber(row);

  const copyNumber = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(noticeNo);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
      }
    },
    [noticeNo]
  );

  const cardInner = (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="shrink-0 rounded-xl bg-emerald-50 p-3 transition-colors group-hover:bg-emerald-100">
            <Trophy className="size-6 text-emerald-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">
              {row.bid_ntce_nm ?? "공고명 없음"}
            </h2>
            <p className="mt-1 font-mono text-sm text-slate-500">{noticeNo}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {row.is_clean_related ? (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              청소 관련
            </span>
          ) : null}
          {badge ? (
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
          ) : null}
        </div>
      </div>

      <div
        className="mb-4 h-px bg-gradient-to-r from-slate-200 via-emerald-200 to-slate-200"
        aria-hidden
      />

      {/* 낙찰금액 히어로 — 입찰카드의 강조 박스와 동일 역할 */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 p-4 shadow-md transition-all group-hover:from-emerald-600 group-hover:via-teal-600 group-hover:to-teal-700 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-white/85">낙찰금액</p>
        <p className="mt-1 break-all text-2xl font-bold leading-tight tracking-tight text-white tabular-nums sm:text-3xl">
          {formatMoney(awardAmt)}
        </p>
        {awardAmt != null ? (
          <p className="mt-1 text-sm font-medium text-white/90">({formatMoneyMan(awardAmt)})</p>
        ) : null}
        {detailHref ? (
          <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
            <span className="text-sm font-semibold">상세보기</span>
            <ArrowRight className="size-4" aria-hidden />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">개찰일시</p>
          <p className="mt-0.5 font-semibold text-slate-800">
            {row.openg_dt ? formatDate(row.openg_dt, { withTime: true }) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">예정·추정가</p>
          <p className="mt-0.5 font-semibold text-slate-800">{formatMoney(presmpt)}</p>
          {presmpt != null ? <p className="mt-0.5 text-xs text-slate-500">({formatMoneyMan(presmpt)})</p> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">낙찰률·경쟁</p>
          <p className="mt-0.5 font-semibold text-slate-800">
            {pct != null ? `${pct.toFixed(2)}%` : <span className="font-normal text-slate-500">산출 불가</span>}
            {row.competition_summary ? (
              <span className="block pt-1 text-sm font-normal text-slate-600">{row.competition_summary}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-500">낙찰자</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900">{row.sucsfbider_nm ?? "—"}</p>
      </div>
    </>
  );

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-lg">
      {detailHref ? (
        <Link href={detailHref} className="block">
          {cardInner}
        </Link>
      ) : (
        <div className="block">{cardInner}</div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {detailHref ? (
            <Link
              href={detailHref}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              입찰 공고 상세
            </Link>
          ) : (
            <span className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              동일 공고가 없으면 상세 링크가 없습니다
            </span>
          )}
          <a
            href="https://www.g2b.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={(e) => e.stopPropagation()}
          >
            나라장터 원문
          </a>
          <button
            type="button"
            onClick={copyNumber}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? "복사됨" : "공고번호 복사"}
          </button>
        </div>
      </div>
    </article>
  );
}
