"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  Home,
  FileText,
  FolderOpen,
  Gavel,
  LayoutDashboard,
  FileSignature,
  MapPin,
  Calculator,
} from "lucide-react";
import HeaderAuth from "./HeaderAuth";

const navItems = [
  { href: "/", label: "홈", Icon: Home },
  { href: "/archive", label: "뉴스레터 아카이브", Icon: FileText },
  { href: "/categories", label: "카테고리", Icon: FolderOpen },
  { href: "/tenders", label: "입찰 공고", Icon: Gavel },
  { href: "/tenders/dashboard", label: "입찰 대시보드", Icon: LayoutDashboard },
  { href: "/contracts", label: "계약", Icon: FileSignature },
  { href: "/ugc", label: "현장후기", Icon: MapPin },
  { href: "/estimate", label: "견적 계산기", Icon: Calculator },
];

const iconBtnClass =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-white/60 hover:text-slate-900 touch-manipulation";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto flex h-14 min-h-[56px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 touch-manipulation">
            <motion.span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              N
            </motion.span>
            <span className="hidden font-bold text-slate-800 sm:inline">Newslett</span>
          </Link>

          {/* PC: 가로 네비 */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="메인 메뉴">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <motion.span
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </motion.span>
              </Link>
            ))}
          </nav>

          {/* 우측: 검색, 알림, 유저, 관리자(PC) / 햄버거(모바일) */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <motion.button
              type="button"
              className={`${iconBtnClass} hidden sm:flex`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              aria-label="검색"
            >
              <Search className="h-5 w-5" />
            </motion.button>
            <motion.div
              className={`${iconBtnClass} relative hidden sm:flex`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Bell className="h-5 w-5" />
              <motion.span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </motion.div>
            <span className="hidden min-h-[44px] items-center md:flex">
              <motion.span className="contents" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <HeaderAuth />
              </motion.span>
            </span>
            <Link href="/admin" className="hidden min-h-[44px] items-center md:flex">
              <motion.span
                className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200/80"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">관리자</span>
              </motion.span>
            </Link>
            <motion.button
              type="button"
              className={`${iconBtnClass} md:hidden`}
              whileTap={{ scale: 0.98 }}
              aria-label="메뉴 열기"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* 모바일 드로어 */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="메뉴"
              className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-[320px] flex-col border-l border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex min-h-[56px] items-center justify-between border-b border-slate-200/80 px-4">
                <span className="font-bold text-slate-800">메뉴</span>
                <motion.button
                  type="button"
                  className={`${iconBtnClass}`}
                  onClick={() => setMenuOpen(false)}
                  aria-label="메뉴 닫기"
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-4" aria-label="모바일 메뉴">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 touch-manipulation"
                    onClick={() => setMenuOpen(false)}
                  >
                    <item.Icon className="h-5 w-5 shrink-0 text-slate-500" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="border-t border-slate-200/80 p-4 space-y-2">
                <div className="flex min-h-[44px] items-center md:hidden">
                  <HeaderAuth />
                </div>
                <Link
                  href="/admin"
                  className="flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 md:hidden"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-5 w-5 shrink-0 text-slate-500" />
                  <span className="font-medium">관리자</span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
