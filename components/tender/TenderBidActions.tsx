"use client";

import { useCallback, useState } from "react";
import { ExternalLink, FileText, Copy, Check } from "lucide-react";

type Props = {
  tenderNumber: string;
  hasAttachments: boolean;
  onOpenAttachments?: () => void;
  /** 기본 true. 상세 상단 등에서 나라장터·복사를 숨길 때 false */
  showG2bLink?: boolean;
  showCopyButton?: boolean;
};

export default function TenderBidActions({
  tenderNumber,
  hasAttachments,
  onOpenAttachments,
  showG2bLink = true,
  showCopyButton = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tenderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [tenderNumber]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {showG2bLink ? (
        <a
          href="https://www.g2b.go.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-lg"
        >
          <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
          <span>나라장터 원문 보기</span>
        </a>
      ) : null}
      {hasAttachments && onOpenAttachments && (
        <button
          type="button"
          onClick={onOpenAttachments}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
        >
          <FileText className="h-5 w-5 shrink-0" aria-hidden />
          <span>첨부파일 보기</span>
        </button>
      )}
      {showCopyButton ? (
        <button
          type="button"
          onClick={copyNumber}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-medium transition-all duration-200 ${
            copied
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-5 w-5 shrink-0" aria-hidden />
              <span>복사됨</span>
            </>
          ) : (
            <>
              <Copy className="h-5 w-5 shrink-0" aria-hidden />
              <span>공고번호 복사</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
