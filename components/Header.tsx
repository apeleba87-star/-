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
  BarChart3,
  Layers,
  BookOpen,
  Sparkles,
  HelpCircle,
  Handshake,
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

type NavSubItem = {
  href?: string;
  label: string;
  Icon: typeof Home;
  disabled?: boolean;
};

type NavColumn = { title: string; items: NavSubItem[] };

type NavGroup = {
  kind: "group";
  label: string;
  Icon: typeof Home;
  items: NavSubItem[];
};

type NavMegaGroup = {
  kind: "mega";
  label: string;
  Icon: typeof Home;
  columns: NavColumn[];
};

type PrimaryNavEntry =
  | ({ kind: "link" } & NavItem)
  | NavGroup
  | NavMegaGroup;

type MobileDrawerRow =
  | ({ kind: "link" } & NavItem)
  | { kind: "groupHeader"; label: string; Icon: typeof Home }
  | { kind: "subHeader"; label: string }
  | ({ kind: "groupItem" } & { href: string; label: string; Icon: typeof Home })
  | { kind: "disabledItem"; label: string; Icon: typeof Home };

/** 데스크톱 가운데 */
const primaryNavItems: PrimaryNavEntry[] = [
  { kind: "link", href: "/", label: "홈", Icon: Home },
  {
    kind: "mega",
    label: "데이터 분석",
    Icon: BarChart3,
    columns: [
      {
        title: "나라장터 공고",
        items: [
          { href: "/tenders", label: "입찰 공고", Icon: Gavel },
          { href: "/tender-awards", label: "낙찰 공고", Icon: Trophy },
        ],
      },
      {
        title: "일간 리포트",
        items: [
          { href: "/news?section=report&category=report", label: "입찰", Icon: Gavel },
          { href: "/news?section=report&category=award_report", label: "낙찰", Icon: Trophy },
          { href: "/marketing-report", label: "마케팅", Icon: Sparkles },
          { href: "/job-market-report", label: "일당", Icon: Landmark },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "서비스",
    Icon: Layers,
    items: [
      { href: "/listings", label: "현장 마켓", Icon: Briefcase },
      { href: "/partners", label: "협력 센터", Icon: Handshake },
      { href: "/jobs", label: "인력 센터", Icon: UserPlus },
    ],
  },
  {
    kind: "group",
    label: "콘텐츠",
    Icon: BookOpen,
    items: [
      { label: "업계소식", Icon: Newspaper, disabled: true },
      { href: "/estimate", label: "견적 계산기", Icon: Calculator },
      { label: "청소 기술", Icon: FileText, disabled: true },
      { label: "이용 안내", Icon: HelpCircle, disabled: true },
    ],
  },
];

/** 모바일 드로어 + 데스크톱 오른쪽 (관리자만) */
const adminNavItems: NavItem[] = [
  { href: "/admin", label: "관리자 모드", shortLabel: "관리자", Icon: Shield },
  { href: "/archive", label: "뉴스레터 아카이브", shortLabel: "아카이브", Icon: FileText },
];

const iconBtnClass =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-white/60 hover:text-slate-900 touch-manipulation";

function NavDisabledMenuLabel({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <span className="ml-1.5 shrink-0 text-xs font-normal text-slate-400">(준비중)</span>
    </>
  );
}

function navLinkActive(
  pathname: string,
  href: string,
) {
  const pathOnly = href.split("?")[0];
  return pathOnly === "/" ? pathname === "/" : pathname.startsWith(pathOnly);
}

function navSubItemActive(
  pathname: string,
  item: NavSubItem,
) {
  if (item.disabled || !item.href) return false;
  return navLinkActive(pathname, item.href);
}

function navEntryActive(
  pathname: string,
  entry: NavGroup | NavMegaGroup,
) {
  if (entry.kind === "group") {
    return entry.items.some((i) =>
      navSubItemActive(pathname, i),
    );
  }
  return entry.columns.some((col) =>
    col.items.some((i) => navSubItemActive(pathname, i)),
  );
}

function primaryToMobileRows(entry: PrimaryNavEntry): MobileDrawerRow[] {
  if (entry.kind === "link") return [entry];
  if (entry.kind === "mega") {
    return [
      { kind: "groupHeader", label: entry.label, Icon: entry.Icon },
      ...entry.columns.flatMap((col) => [
        { kind: "subHeader" as const, label: col.title },
        ...col.items.map((item): MobileDrawerRow =>
          item.disabled || !item.href
            ? { kind: "disabledItem", label: item.label, Icon: item.Icon }
            : {
                kind: "groupItem",
                href: item.href,
                label: item.label,
                Icon: item.Icon,
              },
        ),
      ]),
    ];
  }
  return [
    { kind: "groupHeader", label: entry.label, Icon: entry.Icon },
    ...entry.items.map((item): MobileDrawerRow =>
      item.disabled || !item.href
        ? { kind: "disabledItem", label: item.label, Icon: item.Icon }
        : {
            kind: "groupItem",
            href: item.href,
            label: item.label,
            Icon: item.Icon,
          },
    ),
  ];
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdminNav, setShowAdminNav] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const mobileDrawerItems: MobileDrawerRow[] = [
    ...primaryNavItems.flatMap(primaryToMobileRows),
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
                  const isActive = navLinkActive(
                    pathname,
                    entry.href,
                  );
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
                const groupActive = navEntryActive(
                  pathname,
                  entry,
                );
                const isMega = entry.kind === "mega";
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
                      className={`invisible absolute left-1/2 top-full z-[60] mt-1 hidden -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white py-2 shadow-lg opacity-0 transition-[opacity,visibility] duration-150 group-hover/item:visible group-hover/item:flex group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:flex group-focus-within/item:opacity-100 ${
                        isMega
                          ? "min-w-[20rem] flex-row gap-0 px-0"
                          : "min-w-[11rem] flex-col py-1"
                      }`}
                      role="menu"
                      aria-label={entry.label}
                    >
                      {isMega
                        ? entry.columns.map((col) => (
                            <div
                              key={col.title}
                              className="min-w-[9.5rem] border-slate-100 px-3 first:border-r first:pr-4"
                            >
                              <p className="px-1 pb-1.5 pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                                {col.title}
                              </p>
                              <div className="flex flex-col">
                                {col.items.map((sub) => {
                                  const subActive = navSubItemActive(
                                    pathname,
                                    sub,
                                  );
                                  const key =
                                    sub.href ??
                                    `${col.title}-${sub.label}-disabled`;
                                  if (sub.disabled || !sub.href) {
                                    return (
                                      <span
                                        key={key}
                                        role="menuitem"
                                        aria-disabled="true"
                                        className="pointer-events-none flex cursor-not-allowed flex-wrap items-center gap-x-0 gap-y-0.5 px-3 py-2 text-sm font-medium text-slate-400"
                                      >
                                        <sub.Icon className="h-4 w-4 shrink-0 text-slate-300" />
                                        {sub.disabled ? (
                                          <NavDisabledMenuLabel label={sub.label} />
                                        ) : (
                                          sub.label
                                        )}
                                      </span>
                                    );
                                  }
                                  return (
                                    <Link
                                      key={key}
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
                          ))
                        : entry.items.map((sub) => {
                            const subActive = navSubItemActive(
                              pathname,
                              sub,
                            );
                            const key =
                              sub.href ??
                              `${entry.label}-${sub.label}-disabled`;
                            if (sub.disabled || !sub.href) {
                              return (
                                <span
                                  key={key}
                                  role="menuitem"
                                  aria-disabled="true"
                                  className="pointer-events-none flex cursor-not-allowed flex-wrap items-center gap-x-0 gap-y-0.5 px-3 py-2 text-sm font-medium text-slate-400"
                                >
                                  <sub.Icon className="h-4 w-4 shrink-0 text-slate-300" />
                                  {sub.disabled ? (
                                    <NavDisabledMenuLabel label={sub.label} />
                                  ) : (
                                    sub.label
                                  )}
                                </span>
                              );
                            }
                            return (
                              <Link
                                key={key}
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
                  const isActive = navLinkActive(
                    pathname,
                    item.href,
                  );
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
                {mobileDrawerItems.map((item, idx) => {
                  if (item.kind === "groupHeader") {
                    return (
                      <div
                        key={`head-${item.label}-${idx}`}
                        className="flex min-h-[40px] items-center gap-2 px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        <item.Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        {item.label}
                      </div>
                    );
                  }
                  if (item.kind === "subHeader") {
                    return (
                      <div
                        key={`sub-${item.label}-${idx}`}
                        className="min-h-[36px] px-4 pb-0.5 pl-8 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {item.label}
                      </div>
                    );
                  }
                  if (item.kind === "disabledItem") {
                    return (
                      <div
                        key={`dis-${item.label}-${idx}`}
                        className="pointer-events-none flex min-h-[48px] cursor-not-allowed flex-wrap items-center gap-x-1 gap-y-0.5 rounded-xl py-3 pl-10 pr-4 text-slate-400"
                        aria-disabled="true"
                      >
                        <item.Icon className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
                        <span className="flex flex-wrap items-baseline gap-x-1 font-medium">
                          <NavDisabledMenuLabel label={item.label} />
                        </span>
                      </div>
                    );
                  }
                  const isActive = navLinkActive(
                    pathname,
                    item.href,
                  );
                  const padClass =
                    item.kind === "groupItem" ? "pl-10" : "px-4";
                  return (
                    <Link
                      key={`${item.href}-${idx}`}
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
