"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

export default function TenderCardActions({
  tenderId,
  tenderNumber,
}: {
  tenderId: string;
  tenderNumber: string;
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/tenders/${tenderId}`}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        상세보기
      </Link>
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
