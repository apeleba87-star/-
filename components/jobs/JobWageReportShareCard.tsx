"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Share2, Users } from "lucide-react";
import {
  buildJobWageShareCopy,
  jobWageShareClipboardText,
  type JobWageSharePreview,
} from "@/lib/report/job-wage-share-copy";
import { cn } from "@/lib/utils";

const GRANT_DELAY_MS = 400;

type SharePhase = "idle" | "working" | "shared" | "copied" | "error";

type Props = {
  reportDate: string;
  loginNextPath: string;
  isLoggedIn: boolean;
  preview: JobWageSharePreview;
};

async function recordShareGrant(reportDate: string): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    const res = await fetch("/api/report/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_wage_report_date: reportDate }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (data.ok) return;
    if (i < 2) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
}

export default function JobWageReportShareCard({
  reportDate,
  loginNextPath,
  isLoggedIn,
  preview,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<SharePhase>("idle");

  const copy = useMemo(() => buildJobWageShareCopy(preview), [preview]);
  const [shareUrl, setShareUrl] = useState(`/job-market-report/${reportDate}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href.split("#")[0]!);
    }
  }, [reportDate]);

  function resolvedShareUrl(): string {
    if (typeof window !== "undefined" && window.location.href) {
      return window.location.href.split("#")[0]!;
    }
    return shareUrl;
  }

  useEffect(() => {
    if (phase === "idle" || phase === "working") return;
    const t = window.setTimeout(() => setPhase("idle"), 2800);
    return () => window.clearTimeout(t);
  }, [phase]);

  async function afterShareAction(kind: "shared" | "copied") {
    setPhase(kind);
    if (isLoggedIn) {
      window.setTimeout(() => {
        void recordShareGrant(reportDate).then(() => router.refresh());
      }, GRANT_DELAY_MS);
    }
  }

  async function handleNativeShare() {
    if (!isLoggedIn) return;
    setPhase("working");
    const url = resolvedShareUrl();
    const clipboard = jobWageShareClipboardText(copy, url);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: copy.title, text: copy.message, url });
        await afterShareAction("shared");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboard);
        await afterShareAction("copied");
        return;
      }
      setPhase("error");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setPhase("idle");
        return;
      }
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(clipboard);
          await afterShareAction("copied");
          return;
        } catch {
          setPhase("error");
        }
      } else {
        setPhase("error");
      }
    }
  }

  async function handleCopyLink() {
    setPhase("working");
    const url = resolvedShareUrl();
    const clipboard = jobWageShareClipboardText(copy, url);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no_clipboard");
      await navigator.clipboard.writeText(clipboard);
      await afterShareAction("copied");
    } catch {
      setPhase("error");
    }
  }

  const success = phase === "shared" || phase === "copied";
  const working = phase === "working";

  return (
    <section
      className="overflow-hidden rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/50 shadow-md ring-1 ring-teal-100/80"
      aria-label="일당 리포트 팀 공유"
    >
      <div className="border-b border-teal-100/90 bg-white/60 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/25">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">팀에 알리기</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">이 일당 리포트 공유하기</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isLoggedIn
                ? "아래 미리보기 문구가 카카오톡·문자 등으로 전달됩니다."
                : "로그인하면 미리보기 문구와 함께 공유할 수 있습니다."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-inner ring-1 ring-slate-100/80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">미리보기</p>
          <p className="mt-2 text-base font-bold text-slate-900">{copy.previewHeadline}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{copy.previewDetail}</p>
          {copy.previewMeta ? (
            <p className="mt-2 text-xs text-slate-500">{copy.previewMeta}</p>
          ) : null}
          <p className="mt-3 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-teal-800 ring-1 ring-slate-100">
            {shareUrl}
          </p>
        </div>

        {success ? (
          <div
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-800"
            role="status"
            aria-live="polite"
          >
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {phase === "shared" ? "공유했습니다. 팀에 전달해 보세요." : "문구와 링크를 복사했습니다."}
          </div>
        ) : null}

        {phase === "error" ? (
          <p className="text-center text-xs text-rose-600" role="alert">
            공유가 취소되었거나 복사에 실패했습니다. 다시 시도해 주세요.
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={working}
              className={cn(
                "inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-md transition",
                "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700",
                "disabled:cursor-wait disabled:opacity-70"
              )}
            >
              {working ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Share2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {working ? "처리 중…" : "공유하기"}
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(loginNextPath)}`}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700"
            >
              <Share2 className="h-4 w-4 shrink-0" aria-hidden />
              로그인하고 공유하기
            </Link>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={working}
            className={cn(
              "inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition",
              "hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-900",
              "disabled:cursor-wait disabled:opacity-70",
              phase === "copied" && "border-emerald-200 text-emerald-800"
            )}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            링크 복사
          </button>
        </div>

        {!isLoggedIn ? (
          <p className="text-center text-xs text-slate-500">
            <Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} className="font-medium text-teal-700 underline">
              로그인
            </Link>
            하면 표·심화 인사이트를 무료로 볼 수 있습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
