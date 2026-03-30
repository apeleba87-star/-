"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type Props = {
  tsv: string;
  label?: string;
};

/** 공유·구독 해제 시에만 부모에서 렌더 */
export default function JobWageProvinceTableCopyButton({ tsv, label = "표 복사 (탭 구분)" }: Props) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function copy() {
    setErr(null);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } else {
        setErr("이 환경에서는 복사를 지원하지 않습니다.");
      }
    } catch {
      setErr("복사에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50"
      >
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {done ? "복사됨" : label}
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
