"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePost, setPostPrivate } from "./actions";

type Props = {
  postId: string;
  isPrivate: boolean;
};

export default function PostRowActions({ postId, isPrivate }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("이 글을 삭제할까요? 복구할 수 없습니다.")) return;
    setDeleting(true);
    setMessage(null);
    const result = await deletePost(postId);
    setDeleting(false);
    if (result.ok) router.refresh();
    else setMessage(result.error);
  }

  async function handleTogglePrivate() {
    setToggling(true);
    setMessage(null);
    const result = await setPostPrivate(postId, !isPrivate);
    setToggling(false);
    if (result.ok) router.refresh();
    else setMessage(result.error);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleTogglePrivate}
        disabled={toggling}
        className={`text-sm underline disabled:opacity-50 ${isPrivate ? "text-amber-600 hover:text-amber-700" : "text-slate-600 hover:text-slate-800"}`}
      >
        {isPrivate ? "공개로 전환" : "비공개"}
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm text-red-600 underline hover:text-red-700 disabled:opacity-50"
      >
        삭제
      </button>
      {message && <span className="text-xs text-red-600" role="alert">{message}</span>}
    </div>
  );
}
