"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Pencil } from "lucide-react";
import { closeJobPost } from "@/app/jobs/[id]/actions";
import { glassCard } from "@/lib/ui-styles";

type Props = {
  jobPostId: string;
  isClosed: boolean;
};

export default function JobPostOwnerActions({ jobPostId, isClosed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClosePost() {
    setError(null);
    setLoading(true);
    const result = await closeJobPost(jobPostId);
    setLoading(false);
    if (result?.ok) {
      window.location.reload();
    } else {
      setError(result?.error ?? "마감 처리에 실패했습니다.");
    }
  }

  return (
    <section className={`${glassCard} p-4`}>
      <h2 className="text-sm font-semibold text-slate-800">관리</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        {isClosed ? "마감된 글입니다. 수정만 가능합니다." : "글 전체를 마감하면 새 지원을 받지 않습니다."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/jobs/${jobPostId}/edit`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          수정
        </Link>
        {!isClosed && (
          <button
            type="button"
            disabled={loading}
            onClick={handleClosePost}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" aria-hidden />
            글 전체 마감
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
