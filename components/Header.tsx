"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Menu,
  X,
  Home,
  FileText,
  Gavel,
  Trophy,
  Briefcase,
  UserPlus,
  Calculator,
  Newspaper,
  Shield,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import HeaderAuth from "./HeaderAuth";
import NotificationBell from "./notifications/NotificationBell";
import TenderFocusNavChip from "./TenderFocusNavChip";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  /** 데스크톱 오른쪽 관리자 영역용 짧은 라벨 */
  shortLabel?: string;
};

type NavGroup = {
  kind: "group";
  label: string;
  Icon: typeof Home;
  items: { href: string; label: string; Icon: typeof Home }[];
};

type PrimaryNavEntry =
  | ({ kind: "link" } & NavItem)
  | NavGroup;

type MobileDrawerRow =
  | ({ kind: "link" } & NavItem)
  | { kind: "groupHeader"; label: string; Icon: typeof Home }
  | ({ kind: "groupItem" } & { href: string; label: string; Icon: typeof Home });

/** 데스크톱 가운데: 공개 메뉴만 (한 줄 유지) */
const primaryNavItems: PrimaryNavEntry[] = [
  { kind: "link", href: "/", label: "홈", Icon: Home },
  { kind: "link", href: "/news", label: "업계 소식", Icon: Newspaper },
  {
    kind: "group",
    label: "나라장터 공고",
    Icon: Landmark,
    items: [
      { href: "/tenders", label: "입찰공고", Icon: Gavel },
      { href: "/tender-awards", label: "낙찰공고", Icon: Trophy },
    ],
  },
  { kind: "link", href: "/listings", label: "현장 거래", Icon: Briefcase },
  { kind: "link", href: "/jobs", label: "인력 구인", Icon: UserPlus },
  { kind: "link", href: "/estimate", label: "견적 계산기", Icon: Calculator },
];

/** 모바일 드로어 + 데스크톱 오른쪽 (관리자만) */
const adminNavItems: NavItem[] = [
  { href: "/admin", label: "관리자 모드", shortLabel: "관리자", Icon: Shield },
  { href: "/archive", label: "뉴스레터 아카이브", shortLabel: "아카이브", Icon: FileText },
];

const iconBtnClass =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-white/60 hover:text-slate-900 touch-manipulation";

function navLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function navGroupActive(
  pathname: string,
  items: { href: string }[],
) {
  return items.some((i) => navLinkActive(pathname, i.href));
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdminNav, setShowAdminNav] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const mobileDrawerItems: MobileDrawerRow[] = [
    ...primaryNavItems.flatMap((entry): MobileDrawerRow[] =>
      entry.kind === "link"
        ? [entry]
        : [
            { kind: "groupHeader", label: entry.label, Icon: entry.Icon },
            ...entry.items.map(
              (item): MobileDrawerRow => ({
                kind: "groupItem",
                ...item,
              }),
            ),
          ],
    ),
    ...(showAdminNav
      ? adminNavItems.map(
          (item): MobileDrawerRow => ({ kind: "link", ...item }),
        )
      : []),
  ];

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const fetchProfileRole = useCallback(() => {
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
  }, []);

  useEffect(() => {
    fetchProfileRole();
  }, [pathname, fetchProfileRole]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setEmail(session?.user?.email ?? null);
      setIsLoggedIn(!!session?.user);
      if (event === "SIGNED_OUT") setShowAdminNav(false);
      router.refresh();
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const onFocus = () => fetchProfileRole();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchProfileRole]);

  return (
    <>
      <motion.header
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="page-shell flex h-14 min-h-[56px] items-center justify-between gap-2 lg:grid lg:min-h-[56px] lg:h-auto lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-3 lg:py-1.5 xl:h-14 xl:py-0">
          <div className="flex min-w-0 shrink-0 items-center gap-2 justify-self-start">
            <Link
              href="/"
              className="flex min-h-[44px] min-w-0 items-center gap-1.5 touch-manipulation sm:gap-2"
            >
              <motion.span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md lg:h-10 lg:w-10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                C
              </motion.span>
              <span className="hidden text-sm font-bold text-slate-800 xs:inline xs:max-w-[10rem] xs:truncate sm:max-w-none sm:overflow-visible sm:whitespace-normal sm:text-base lg:text-lg">
                클린아이덱스
              </span>
            </Link>
            <TenderFocusNavChip />
          </div>

          <nav
            className="hidden min-w-0 w-full justify-center justify-self-stretch lg:flex"
            aria-label="메인 메뉴"
          >
            {/* PC: 가로 스크롤 없음 — 중앙 열 전체 너비를 쓰고, 매우 좁을 때만 줄바꿈(xl↑ 한 줄 고정) */}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 xl:flex-nowrap xl:gap-x-1">
              {primaryNavItems.map((entry) => {
                if (entry.kind === "link") {
                  const isActive = navLinkActive(pathname, entry.href);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className="inline-flex shrink-0 cursor-pointer items-center"
                      prefetch={true}
                    >
                      <motion.span
                        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-2 text-[0.8125rem] font-medium xl:gap-1.5 xl:px-2.5 xl:text-sm ${
                          isActive
                            ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <entry.Icon className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" />
                        {entry.label}
                      </motion.span>
                    </Link>
                  );
                }
                const groupActive = navGroupActive(pathname, entry.items);
                return (
                  <div
                    key={entry.label}
                    className="group/item relative inline-flex shrink-0"
                  >
                    <div
                      className={`flex cursor-default items-center gap-0.5 whitespace-nowrap rounded-lg px-1.5 py-2 text-[0.8125rem] font-medium xl:gap-1.5 xl:px-2.5 xl:text-sm ${
                        groupActive
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      role="presentation"
                    >
                      <entry.Icon className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" />
                      <span>{entry.label}</span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 opacity-70 xl:h-3.5 xl:w-3.5 ${
                          groupActive ? "text-white" : ""
                        }`}
                        aria-hidden
                      />
                    </div>
                    <div
                      className="invisible absolute left-1/2 top-full z-[60] mt-1 hidden min-w-[11rem] -translate-x-1/2 flex-col rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg opacity-0 transition-[opacity,visibility] duration-150 group-hover/item:visible group-hover/item:flex group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:flex group-focus-within/item:opacity-100"
                      role="menu"
                      aria-label={entry.label}
                    >
                      {entry.items.map((sub) => {
                        const subActive = navLinkActive(pathname, sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            prefetch={true}
                            role="menuitem"
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                              subActive
                                ? "bg-teal-50 text-teal-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <sub.Icon className="h-4 w-4 shrink-0 text-slate-500" />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center justify-end justify-self-end gap-1 sm:gap-1.5 lg:pl-2">
            <NotificationBell isLoggedIn={isLoggedIn} />
            {showAdminNav ? (
              <div className="hidden items-center gap-0.5 border-r border-slate-200/80 pr-2 lg:flex">
                {adminNavItems.map((item) => {
                  const isActive = navLinkActive(pathname, item.href);
                  const label = item.shortLabel ?? item.label;
                  return (
                    <Link key={item.href} href={item.href} prefetch={true} className="shrink-0">
                      <motion.span
                        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium xl:px-2.5 xl:text-[0.8125rem] ${
                          isActive
                            ? "bg-slate-200/90 text-slate-900"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <item.Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        {label}
                      </motion.span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
            <span className="hidden min-h-[44px] shrink-0 items-center md:flex">
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
                {mobileDrawerItems.map((item) => {
                  if (item.kind === "groupHeader") {
                    return (
                      <div
                        key={`head-${item.label}`}
                        className="flex min-h-[40px] items-center gap-2 px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        <item.Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        {item.label}
                      </div>
                    );
                  }
                  const isActive = navLinkActive(pathname, item.href);
                  const padClass =
                    item.kind === "groupItem" ? "pl-10" : "px-4";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`flex min-h-[48px] items-center gap-3 rounded-xl py-3 touch-manipulation ${padClass} ${
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
              {isLoggedIn ? (
                <div className="px-4 pb-2 md:hidden">
                  <Link
                    href="/notifications"
                    className="flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Bell className="h-5 w-5 shrink-0 text-slate-500" />
                    <span className="font-medium">알림</span>
                  </Link>
                </div>
              ) : null}
              <div className="border-t border-slate-200/80 p-4">
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
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
