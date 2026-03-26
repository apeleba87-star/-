"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useState } from "react";

export type NotifRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsClient({ initialItems }: { initialItems: NotifRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", { method: "POST", credentials: "include" });
      const res = await fetch("/api/notifications?limit=100", { credentials: "include" });
      if (res.ok) {
        const j = await res.json();
        if (Array.isArray(j.items)) setItems(j.items);
      }
    } finally {
      setBusy(false);
      router.refresh();
    }
  }, [router]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, read_at: new Date().toISOString() } : it)));
    router.refresh();
  };

  const markAll = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((it) => ({ ...it, read_at: it.read_at ?? new Date().toISOString() })));
    router.refresh();
  };

  return (
    <div className="page-shell py-8 lg:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">알림</h1>
            <p className="mt-1 text-sm text-slate-600">
              입찰·구인·구독 관련 알림입니다. &quot;내 관심&quot;을 저장한 경우에만 입찰 알림이 생성됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => reload()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? "갱신 중…" : "새로고침"}
            </button>
            <button
              type="button"
              onClick={() => void markAll()}
              className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              모두 읽음
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            알림이 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <Link
                  href={it.link_path}
                  onClick={() => void markRead(it.id)}
                  className={`block rounded-xl border px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/50 ${
                    !it.read_at ? "border-teal-200/80 bg-teal-50/30" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="font-medium text-slate-900">{it.title}</p>
                  {it.body ? <p className="mt-1 text-sm text-slate-600">{it.body}</p> : null}
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(it.created_at).toLocaleString("ko-KR")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
