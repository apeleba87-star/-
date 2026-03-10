"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { closeJobPost } from "@/app/jobs/[id]/actions";
import { glassCard } from "@/lib/ui-styles";

type Props = {
  jobPostId: string;
  isClosed: boolean;
};

export default function JobPostOwnerActions({ jobPostId, isClosed }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClosePost() {
    setLoading(true);
    const result = await closeJobPost(jobPostId);
    setLoading(false);
    if (result?.ok) window.location.reload();
  }

  if (isClosed) return null;

  return (
    <section className={`${glassCard} p-4`}>
      <h2 className="text-sm font-semibold text-slate-800">관리</h2>
      <p className="mt-0.5 text-xs text-slate-500">글 전체를 마감하면 새 지원을 받지 않습니다.</p>
      <div className="mt-3">
        <button
          type="button"
          disabled={loading}
          onClick={handleClosePost}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" aria-hidden />
          글 전체 마감
        </button>
      </div>
    </section>
  );
}
