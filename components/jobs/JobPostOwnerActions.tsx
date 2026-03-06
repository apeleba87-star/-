"use client";

import { useState } from "react";
import { UserPlus, Lock } from "lucide-react";
import { incrementPositionFilled, closeJobPost } from "@/app/jobs/[id]/actions";

type Position = { id: string; filled_count: number; required_count: number; status: string };

type Props = {
  jobPostId: string;
  positions: Position[];
};

export default function JobPostOwnerActions({ jobPostId, positions }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleIncrement(positionId: string) {
    setLoading(positionId);
    await incrementPositionFilled(positionId, jobPostId);
    setLoading(null);
  }

  async function handleClosePost() {
    setLoading("close");
    await closeJobPost(jobPostId);
    setLoading(null);
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">관리</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {positions.map((pos) => (
          <button
            key={pos.id}
            type="button"
            disabled={pos.status === "closed" || loading !== null}
            onClick={() => handleIncrement(pos.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {pos.filled_count}/{pos.required_count} 충원 +1
          </button>
        ))}
        <button
          type="button"
          disabled={loading !== null}
          onClick={handleClosePost}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          글 전체 마감
        </button>
      </div>
    </section>
  );
}
