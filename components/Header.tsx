"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Menu,
  X,
  Home,
  FileText,
  Gavel,
  Briefcase,
  UserPlus,
  Calculator,
  Newspaper,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import HeaderAuth from "./HeaderAuth";
import HeaderAdminLink from "./HeaderAdminLink";
import TenderFocusNavChip from "./TenderFocusNavChip";

const navItems: { href: string; label: string; Icon: typeof Home; adminOnly?: boolean; showWhenLoggedIn?: boolean }[] = [
  { href: "/", label: "홈", Icon: Home },
  { href: "/admin", label: "관리자 모드", Icon: Shield, adminOnly: true },
  { href: "/archive", label: "뉴스레터 아카이브", Icon: FileText, adminOnly: true },
  { href: "/news", label: "업계 소식", Icon: Newspaper },
  { href: "/tenders", label: "입찰 공고", Icon: Gavel },
  { href: "/listings", label: "현장 거래", Icon: Briefcase },
  { href: "/jobs", label: "인력 구인", Icon: UserPlus },
  { href: "/estimate", label: "견적 계산기", Icon: Calculator },
];

const iconBtnClass =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-white/60 hover:text-slate-900 touch-manipulation";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdminNav, setShowAdminNav] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // 모바일: 경로가 바뀌면 드로어 닫기 (로그인 등 HeaderAuth 링크 클릭 시에도 메뉴가 사라지도록)
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const fetchProfileRole = () => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);
      setIsLoggedIn(!!user);
      if (!user) {
        setShowAdminNav(false);
        return;
      }
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setShowAdminNav(data?.role === "admin" || data?.role === "editor");
        });
    });
  };

  useEffect(() => {
    fetchProfileRole();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setEmail(session?.user?.email ?? null);
      setIsLoggedIn(!!session?.user);
      if (event === "SIGNED_OUT") setShowAdminNav(false);
      router.refresh();
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // 탭 포커스 시 역할 다시 조회 (DB에서 admin으로 바꾼 뒤 이 탭으로 돌아오면 반영)
  useEffect(() => {
    const onFocus = () => fetchProfileRole();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <>
      <motion.header
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto flex h-14 min-h-[56px] max-w-6xl items-center justify-between gap-1.5 px-3 xs:gap-2 xs:px-4 sm:px-6">
          <Link href="/" className="flex min-h-[44px] min-w-0 max-w-[65%] items-center gap-1.5 touch-manipulation xs:max-w-none xs:gap-2">
            <motion.span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              C
            </motion.span>
            <span className="hidden truncate text-sm font-bold text-slate-800 xs:inline sm:text-base">
              클린아이덱스
            </span>
          </Link>

          <div className="hidden shrink-0 lg:block">
            <TenderFocusNavChip />
          </div>

          {/* PC: 가로 네비 */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="메인 메뉴">
            {navItems
              .filter(
                (item) =>
                  item.showWhenLoggedIn
                    ? isLoggedIn
                    : !item.adminOnly || showAdminNav
              )
              .map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-[44px] cursor-pointer items-center"
                    prefetch={true}
                  >
                    <motion.span
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <item.Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </motion.span>
                  </Link>
                );
              })}
          </nav>

          {/* 우측: 알림(로그인 시만), 유저, 관리자(PC) / 햄버거(모바일) */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {isLoggedIn && (
              <motion.button
                type="button"
                className={`${iconBtnClass} relative hidden sm:flex`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                aria-label="알림"
              >
                <Bell className="h-5 w-5" />
                <motion.span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              </motion.button>
            )}
            <span className="hidden min-h-[44px] items-center md:flex">
              <motion.span className="contents" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <HeaderAuth
                  email={email}
                  onSignedOut={() => {
                    setEmail(null);
                    setIsLoggedIn(false);
                    setShowAdminNav(false);
                  }}
                />
              </motion.span>
            </span>
            <HeaderAdminLink variant="pc" />
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
              className="fixed right-0 top-0 z-[70] flex h-full w-[min(100%,360px)] max-w-full flex-col border-l border-white/20 bg-white/95 pt-[env(safe-area-inset-top,0px)] shadow-2xl backdrop-blur-xl md:hidden"
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
                {navItems
                  .filter(
                    (item) =>
                      item.showWhenLoggedIn
                        ? isLoggedIn
                        : !item.adminOnly || showAdminNav
                  )
                  .map((item) => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 touch-manipulation ${
                          isActive
                            ? "bg-gradient-to-r from-teal-500/90 to-emerald-600/90 text-white"
                            : "text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <item.Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
              </nav>
              <div className="border-t border-slate-200/80 p-4 space-y-2">
                <div className="flex min-h-[44px] items-center md:hidden">
                  <HeaderAuth
                    email={email}
                    onSignedOut={() => {
                      setEmail(null);
                      setIsLoggedIn(false);
                      setShowAdminNav(false);
                    }}
                  />
                </div>
                <HeaderAdminLink variant="mobile" onClick={() => setMenuOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
