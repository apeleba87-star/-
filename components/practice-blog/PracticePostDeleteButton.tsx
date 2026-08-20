"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePracticeBlogPost } from "@/app/admin/practice/actions";

export default function PracticePostDeleteButton({
  postId,
  title,
}: {
  postId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`「${title}」 글을 삭제할까요? 복구할 수 없습니다.`)) return;
    setBusy(true);
    setError(null);
    const result = await deletePracticeBlogPost(postId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={busy}
        className="rounded bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
      >
        {busy ? "삭제 중…" : "삭제"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </span>
  );
}
