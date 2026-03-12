"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteQueueItem } from "@/app/admin/newsletter/actions";

type Props = { queueItemId: string; title?: string | null };

export default function DeleteQueueItemButton({ queueItemId, title }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    const label = title && title.length > 30 ? `${title.slice(0, 30)}…` : title || "이 항목";
    if (!confirm(`큐에서 삭제하시겠습니까?\n\n${label}\n\n삭제하면 이 항목은 뉴스레터에 포함되지 않습니다.`)) return;
    setLoading(true);
    setError(null);
    const result = await deleteQueueItem(queueItemId);
    setLoading(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "삭제 실패");
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        aria-label="큐 항목 삭제"
      >
        <Trash2 className="h-4 w-4" />
        {loading ? "처리 중…" : "삭제"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
