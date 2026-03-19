"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import AuthRequiredCta from "@/components/AuthRequiredCta";

export default function TenderCardActions({
  tenderId,
  tenderNumber,
  isLoggedIn = true,
}: {
  tenderId: string;
  tenderNumber: string;
  isLoggedIn?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyNumber = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tenderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [tenderNumber]);

  const detailHref = `/tenders/${tenderId}`;
  const detailBtnClass =
    "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isLoggedIn ? (
        <Link href={detailHref} className={detailBtnClass}>
          상세보기
        </Link>
      ) : (
        <AuthRequiredCta
          isLoggedIn={false}
          href={detailHref}
          message="입찰 공고 상세는 로그인 후 확인할 수 있습니다."
          className={detailBtnClass}
        >
          상세보기
        </AuthRequiredCta>
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
  );
}
