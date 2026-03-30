"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Share2 } from "lucide-react";

const COMPLETE_DELAY_MS = 2000;

export type ReportTeamShareKind = "job_wage" | "marketing";

type Props = {
  kind: ReportTeamShareKind;
  reportDate: string;
  shareTitle: string;
  shareText: string;
  loginNextPath: string;
  layout?: "full" | "compact" | "inline";
};

const TONE = {
  job_wage: {
    box: "border-teal-200/90 bg-white/90 ring-teal-100/60",
    btn: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700",
    link: "text-teal-700",
  },
  marketing: {
    box: "border-indigo-200/90 bg-white/90 ring-indigo-100/60",
    btn: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
    link: "text-indigo-700",
  },
} as const;

function apiBodyForKind(kind: ReportTeamShareKind, reportDate: string): Record<string, string> {
  return kind === "job_wage"
    ? { job_wage_report_date: reportDate }
    : { marketing_report_date: reportDate };
}

async function completeShareGrant(kind: ReportTeamShareKind, reportDate: string): Promise<boolean> {
  const body = apiBodyForKind(kind, reportDate);
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch("/api/report/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (data.ok) return true;
    if (i < 2) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}

export default function ReportTeamShareButton({
  kind,
  reportDate,
  shareTitle,
  shareText,
  loginNextPath,
  layout = "full",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tone = TONE[kind];

  async function handleClick() {
    setLoading(true);
    setError(null);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const payload = `${shareText}\n${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText, url });
        } catch {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(payload);
          } else {
            throw new Error("no_clipboard");
          }
        }
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        setError("이 브라우저에서는 공유 또는 복사를 지원하지 않습니다.");
        setLoading(false);
        return;
      }
    } catch {
      setError("공유가 취소되었거나 완료할 수 없습니다.");
      setLoading(false);
      return;
    }
    await new Promise((r) => setTimeout(r, COMPLETE_DELAY_MS));
    try {
      router.refresh();
      await completeShareGrant(kind, reportDate);
      router.refresh();
    } catch {
      setError("공유는 완료되었습니다. 잠시 후 새로고침 해 주세요.");
      router.refresh();
    }
    setLoading(false);
  }

  if (layout === "inline") {
    const inlineTone =
      kind === "job_wage"
        ? "border-teal-200/90 text-teal-800 hover:bg-teal-50/80"
        : "border-indigo-200/90 text-indigo-800 hover:bg-indigo-50/80";
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex min-h-9 max-w-full shrink-0 items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-60 ${inlineTone}`}
        aria-label={loading ? "처리 중" : "우리 팀 공유"}
      >
        <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{loading ? "처리 중…" : "우리 팀 공유"}</span>
      </button>
    );
  }

  if (layout === "compact") {
    return (
      <div className={`rounded-2xl border p-4 shadow-inner ring-1 ${tone.box}`}>
        <p className="text-sm text-slate-600">
          이미 오늘 열람이 열려 있어도{" "}
          <strong className="font-semibold text-slate-800">팀에 다시 알릴 수 있습니다.</strong>
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={`mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 sm:w-auto ${tone.btn}`}
        >
          <Share2 className="h-4 w-4 shrink-0" aria-hidden />
          {loading ? "처리 중…" : "우리 팀 공유"}
        </button>
        <p className={`mt-2 text-xs text-slate-500`}>
          <Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} className={`font-medium underline ${tone.link}`}>
            로그인
          </Link>
          이 필요합니다.{" "}
          <Link href="/subscribe" className={`font-medium underline ${tone.link}`}>
            구독
          </Link>
          으로 전체를 열 수 있습니다.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-inner ring-1 ${tone.box}`}>
      <p className="text-sm font-medium text-slate-800">
        오늘 <strong className="text-slate-900">첫 우리 팀 공유 1회</strong>로 당일 열람이 열리고, 입찰·일당·마케팅 리포트의{" "}
        <strong className="text-slate-900">심화 영역</strong>에 같은 날 연결됩니다.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 sm:w-auto ${tone.btn}`}
      >
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
        {loading ? "처리 중…" : "우리 팀 공유"}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        <Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} className={`font-medium underline ${tone.link}`}>
          로그인
        </Link>
        이 필요합니다. 공유가 어렵다면{" "}
        <Link href="/subscribe" className={`font-medium underline ${tone.link}`}>
          구독
        </Link>
        으로 전체를 열 수 있습니다.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
