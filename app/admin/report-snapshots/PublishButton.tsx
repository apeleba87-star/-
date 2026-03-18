"use client";

import { useState } from "react";
import Link from "next/link";
import { publishReportSnapshot } from "./actions";

type Props = { snapshotId: string; publishedPostId: string | null };

export default function PublishButton({ snapshotId, publishedPostId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const hasPublishedPost = !!publishedPostId;

  async function handlePublish() {
    setLoading(true);
    setMessage(null);
    const result = await publishReportSnapshot(snapshotId);
    setLoading(false);
    if (result.ok) {
      setMessage({ ok: true, text: result.message });
      window.location.reload();
    } else {
      setMessage({ ok: false, text: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {hasPublishedPost ? (
        <Link
          href={`/admin/posts/${publishedPostId}/edit`}
          className="text-sm text-blue-600 hover:underline"
        >
          글 보기/수정
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handlePublish}
        disabled={loading}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {hasPublishedPost ? "글 내용 갱신" : "글 발행"}
      </button>
      {message && (
        <span className={`text-xs ${message.ok ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
