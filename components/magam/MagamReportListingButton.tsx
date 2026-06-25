"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MAGAM_REPORT_REASON_LABEL,
  MAGAM_REPORT_REASON_TYPES,
  type MagamReportReasonType,
} from "@/lib/magam/report-reasons";

type Props = {
  listingId: string;
  shareSlug: string;
  compact?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export default function MagamReportListingButton({
  listingId,
  shareSlug,
  compact,
  className = "",
  onClick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reasonType, setReasonType] = useState<MagamReportReasonType>("illegal");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/magam/listings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          shareSlug,
          reasonType,
          reasonText: reasonText.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; claimToken?: string | null };
      if (!data.ok) {
        setError(data.error ?? "신고 접수에 실패했습니다.");
        return;
      }
      setClaimToken(data.claimToken ?? null);
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleTriggerClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
    setOpen(true);
    setDone(false);
    setClaimToken(null);
    setError(null);
  }

  const reportsHref = claimToken
    ? `/magam/reports?claim=${encodeURIComponent(claimToken)}`
    : "/magam/reports";
  const loginHref = `/login?from=magam&next=${encodeURIComponent(reportsHref)}`;

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        className={
          className ||
          (compact
            ? "text-[11px] font-medium text-[#8B93A1] underline-offset-2 hover:text-[#DC2626] hover:underline"
            : "text-sm font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline")
        }
      >
        신고
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="magam-report-title"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <>
                <h2 id="magam-report-title" className="text-lg font-bold text-[#141824]">
                  신고가 접수되었습니다
                </h2>
                <p className="mt-2 text-sm text-[#5B6472]">
                  검토 후 부적절한 공고는 운영자가 마감·삭제할 수 있습니다.
                </p>
                {claimToken ? (
                  <>
                    <p className="mt-2 text-xs text-[#8B93A1]">
                      처리 결과를 확인하려면 간편 로그인해 주세요. 로그인 후 이 신고가 내 계정에
                      연결됩니다.
                    </p>
                    <Link
                      href={loginHref}
                      className="mt-4 block rounded-xl bg-[#FEE500] py-3 text-center text-sm font-semibold text-[#191919]"
                      onClick={() => setOpen(false)}
                    >
                      카카오로 로그인하고 내 신고 확인
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-[#8B93A1]">
                      설정의 내 신고 내역에서 처리 상태를 확인할 수 있습니다.
                    </p>
                    <Link
                      href={reportsHref}
                      className="mt-4 block text-center text-sm font-semibold text-[#2563EB]"
                      onClick={() => setOpen(false)}
                    >
                      내 신고 내역 보기
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  확인
                </button>
              </>
            ) : (
              <>
                <h2 id="magam-report-title" className="text-lg font-bold text-[#141824]">
                  공고 신고
                </h2>
                <p className="mt-1 text-sm text-[#5B6472]">
                  허위·불법·스팸 공고를 알려 주세요.
                </p>

                <div className="mt-4 space-y-2">
                  {MAGAM_REPORT_REASON_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E3E6EC] px-3 py-2.5 text-sm"
                    >
                      <input
                        type="radio"
                        name="magam-report-reason"
                        className="accent-[#2563EB]"
                        checked={reasonType === type}
                        onChange={() => setReasonType(type)}
                      />
                      {MAGAM_REPORT_REASON_LABEL[type]}
                    </label>
                  ))}
                </div>

                {reasonType === "other" ? (
                  <textarea
                    className="mt-3 w-full rounded-xl border border-[#E3E6EC] px-3 py-2.5 text-sm"
                    rows={3}
                    placeholder="신고 사유를 적어 주세요"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                ) : (
                  <textarea
                    className="mt-3 w-full rounded-xl border border-[#E3E6EC] px-3 py-2.5 text-sm"
                    rows={2}
                    placeholder="추가 설명 (선택)"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                )}

                {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    className="flex-1 rounded-xl border border-[#E3E6EC] py-3 text-sm font-semibold text-[#5B6472]"
                    onClick={() => setOpen(false)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-[#DC2626] py-3 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void submit()}
                  >
                    {loading ? "접수 중…" : "신고하기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
