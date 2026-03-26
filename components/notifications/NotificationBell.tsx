"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";

type NotifItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

const iconBtnClass =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-white/60 hover:text-slate-900 touch-manipulation";

export default function NotificationBell({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=1", { credentials: "include" });
    if (!res.ok) return;
    const j = await res.json();
    setUnread(typeof j.unreadCount === "number" ? j.unreadCount : 0);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=15", { credentials: "include" });
      if (!res.ok) return;
      const j = await res.json();
      setItems(Array.isArray(j.items) ? j.items : []);
      setUnread(typeof j.unreadCount === "number" ? j.unreadCount : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAndOpen = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "POST", credentials: "include" });
      await loadList();
    } finally {
      setLoading(false);
    }
  }, [loadList]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadSummary();
    const t = window.setInterval(loadSummary, 120_000);
    return () => window.clearInterval(t);
  }, [isLoggedIn, loadSummary]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids }),
    });
    setUnread((u) => Math.max(0, u - ids.length));
    setItems((prev) =>
      prev.map((it) => (ids.includes(it.id) ? { ...it, read_at: new Date().toISOString() } : it))
    );
    router.refresh();
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative hidden sm:block" ref={wrapRef}>
      <motion.button
        type="button"
        className={`${iconBtnClass} relative`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        aria-label="알림"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            void refreshAndOpen();
          }
        }}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-[80] mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200/90 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-800">알림</span>
              <button
                type="button"
                className="text-xs font-medium text-teal-600 hover:underline"
                onClick={async () => {
                  await fetch("/api/notifications/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ all: true }),
                  });
                  setUnread(0);
                  setItems((prev) => prev.map((it) => ({ ...it, read_at: it.read_at ?? new Date().toISOString() })));
                  router.refresh();
                }}
              >
                모두 읽음
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">불러오는 중…</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">새 알림이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <li key={it.id}>
                      <Link
                        href={it.link_path}
                        className={`block px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                          !it.read_at ? "bg-teal-50/40" : ""
                        }`}
                        onClick={() => void markRead([it.id])}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{it.title}</p>
                        {it.body ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{it.body}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(it.created_at).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 px-2 py-2">
              <Link
                href="/notifications"
                className="block rounded-lg py-2 text-center text-sm font-medium text-teal-700 hover:bg-teal-50"
                onClick={() => setOpen(false)}
              >
                전체 보기
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
