"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  adminActionMagamReport,
  adminCloseMagamListing,
  adminDeleteMagamListing,
  adminDismissMagamReport,
  adminSuspendMagamUser,
  adminUnsuspendMagamUser,
} from "@/app/admin/magam-listings/actions";

type ListingRow = {
  id: string;
  user_id: string;
  listing_type: string;
  region_gu: string;
  body_text: string;
  contact_phone: string;
  status: string;
  share_slug: string;
  created_at: string;
  admin_closed_at: string | null;
  admin_close_reason: string | null;
};

type ReportRow = {
  id: string;
  listing_id: string;
  reason_type: string;
  reason_text: string | null;
  status: string;
  created_at: string;
  listing: ListingRow | null;
};

export function MagamListingAdminActions({
  listing,
  magamSuspendedAt,
}: {
  listing: ListingRow;
  magamSuspendedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSuspended = Boolean(magamSuspendedAt);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "처리에 실패했습니다.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/p/${listing.share_slug}`}
          target="_blank"
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          보기
        </Link>
        {listing.status === "open" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => adminCloseMagamListing(listing.id, "운영자 강제 마감"),
                "이 공고를 강제 마감할까요?"
              )
            }
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            강제 마감
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => adminDeleteMagamListing(listing.id),
              "공고를 완전히 삭제합니다. 되돌릴 수 없습니다."
            )
          }
          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
        >
          삭제
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            isSuspended
              ? run(
                  () => adminUnsuspendMagamUser(listing.user_id),
                  "이 사용자의 마감링크 이용 정지를 해제할까요?"
                )
              : run(
                  () => adminSuspendMagamUser(listing.user_id),
                  "이 사용자의 마감링크 이용을 정지하고 열린 공고를 모두 마감할까요?"
                )
          }
          className={
            isSuspended
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              : "rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-50"
          }
        >
          {isSuspended ? "정지 해제" : "이용 정지"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function MagamReportAdminActions({ report }: { report: ReportRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "처리에 실패했습니다.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {report.listing ? (
          <Link
            href={`/p/${report.listing.share_slug}`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            공고 보기
          </Link>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => adminDismissMagamReport(report.id))}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          기각
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => adminActionMagamReport(report.id),
              "신고를 확인하고 공고를 강제 마감할까요?"
            )
          }
          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
        >
          마감·조치
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
