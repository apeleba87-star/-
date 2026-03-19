"use client";

import Link from "next/link";
import { FileText, Lock, ArrowRight } from "lucide-react";
import {
  formatMoneyMan,
  ddayNumber,
  getBaseAmtFromRaw,
  getLowerRateFromRaw,
  shortRegion,
  formatCurrency,
} from "@/lib/tender-utils";
import TenderCardActions from "./TenderCardActions";

export type TenderBidCardT = {
  id: string;
  bid_ntce_no: string | null;
  bid_ntce_ord: string | null;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  bid_ntce_dt: string | null;
  bid_clse_dt: string | null;
  categories: string[] | null;
  raw?: unknown;
  primary_industry_code?: string | null;
  tender_industries?: { industry_code: string }[];
};

function pad3(v: unknown): string {
  const s = String(v ?? "0").replace(/\D/g, "") || "0";
  return s.padStart(3, "0");
}

function tenderNumber(no: string | null, ord: string | null): string {
  if (!no) return "";
  return `${no}-${pad3(ord ?? "0")}`;
}

function getDaysStyle(days: number): string {
  if (days <= 3) return "bg-red-50 text-red-700 border-red-200";
  if (days <= 7) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function getDaysText(days: number): string {
  if (days < 0) return "마감";
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

export default function TenderBidCard({
  tender,
  industryNames,
  hideSensitive = false,
}: {
  tender: TenderBidCardT;
  industryNames?: Record<string, string>;
  /** 비로그인 시 true. 기초금액·낙찰하한율을 블러+자물쇠로 표시 */
  hideSensitive?: boolean;
}) {
  const basePrice =
    tender.base_amt != null ? Number(tender.base_amt) : getBaseAmtFromRaw(tender.raw);
  const lowerRate = getLowerRateFromRaw(tender.raw);
  const daysRemaining = ddayNumber(tender.bid_clse_dt);
  const metaRegion = shortRegion(tender.bsns_dstr_nm ?? tender.ntce_instt_nm);
  const industryLabel =
    tender.tender_industries?.length && industryNames
      ? tender.tender_industries.map((ti) => industryNames[ti.industry_code] ?? ti.industry_code).join(", ")
      : "—";

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-lg">
      <Link href={`/tenders/${tender.id}`} className="block">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-blue-50 p-3 transition-colors group-hover:bg-blue-100">
              <FileText className="size-6 text-blue-600" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                {(tender.bid_ntce_nm as string) || "(제목 없음)"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {tender.ntce_instt_nm || "—"} · {metaRegion} · {industryLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${getDaysStyle(daysRemaining)}`}
            >
              {getDaysText(daysRemaining)}
            </span>
          </div>
        </div>

        <div
          className="mb-4 h-px bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200"
          aria-hidden
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">기초금액</p>
            <div className="mt-0.5 flex items-center gap-2">
              {hideSensitive ? (
                <>
                  <Lock className="size-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="font-semibold text-slate-800 blur-sm select-none">
                    {basePrice != null ? formatMoneyMan(basePrice) : "—"}
                  </span>
                </>
              ) : (
                <p className="font-semibold text-slate-800">
                  {basePrice != null ? formatMoneyMan(basePrice) : "—"}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">낙찰하한율</p>
            <div className="mt-0.5 flex items-center gap-2">
              {hideSensitive ? (
                <>
                  <Lock className="size-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="font-semibold text-slate-800 blur-sm select-none">
                    {lowerRate != null ? `${lowerRate}%` : "—"}
                  </span>
                </>
              ) : (
                <p className="font-semibold text-slate-800">
                  {lowerRate != null ? `${lowerRate}%` : "—"}
                </p>
              )}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border-2 border-blue-600 bg-gradient-to-br from-blue-500 to-indigo-500 p-3 transition-all group-hover:from-blue-600 group-hover:to-indigo-600">
            <p className="text-xs text-white/90">예상 낙찰 하한가</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-white/90" aria-hidden />
              <span className="font-semibold text-white blur-sm select-none">
                {basePrice != null && lowerRate != null
                  ? formatCurrency(Math.floor(basePrice * (lowerRate / 100)))
                  : "—"}
              </span>
            </div>
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-sm font-medium">상세보기</span>
              <ArrowRight className="size-4" aria-hidden />
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <TenderCardActions
          tenderId={tender.id}
          tenderNumber={tenderNumber(tender.bid_ntce_no, tender.bid_ntce_ord)}
        />
      </div>
    </article>
  );
}
