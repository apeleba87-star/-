"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Newspaper,
  Briefcase,
  UserPlus,
  Calculator,
  BarChart3,
  ClipboardList,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { homeDashboardCardClass } from "./home-section-styles";

type DashboardCardProps = {
  title: string;
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
  delay?: number;
  /** true면 링크 비활성화, "출시 예정" 표시 */
  comingSoon?: boolean;
};

function DashboardCard({ title, href, icon, iconBg, children, delay = 0, comingSoon = false }: DashboardCardProps) {
  const content = (
    <div
      className={`${homeDashboardCardClass} flex h-full flex-col ${comingSoon ? "cursor-not-allowed opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${iconBg}`}
        >
          {icon}
        </span>
        {comingSoon ? (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            출시 예정
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ChevronRight className="h-5 w-5" />
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <div className="mt-2 flex-1 text-sm text-slate-600">{children}</div>
      {comingSoon ? (
        <span className="mt-3 inline-flex items-center text-sm font-medium text-slate-500">준비 중입니다</span>
      ) : (
        <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-600">확인하기</span>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      {comingSoon || !href ? (
        <div className="block h-full" aria-disabled="true">{content}</div>
      ) : (
        <Link href={href} className="block h-full">{content}</Link>
      )}
    </motion.div>
  );
}

type IndustryBreakdownItem = { industry_code: string; industry_name: string; count: number };
type TopIndustry = { code: string; name: string; count: number } | null;
type TenderPreview = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  raw?: unknown;
};

type Props = {
  tenderCount: number;
  tenderTodayCount: number;
  topIndustry?: TopIndustry;
  industryBreakdown?: IndustryBreakdownItem[];
  recentTenders?: TenderPreview[];
  newsCount: number;
  listingsCount: number;
  recentListings: { id: string; title: string | null }[];
  jobsOpenCount: number;
  latestNewsletter: { id: string; subject: string; sent_at: string } | null;
  /** 비로그인 시 카드 클릭 시 로그인 페이지( next=목적지 )로 이동해 상세는 로그인 후 확인 */
  isLoggedIn?: boolean;
  /** 개인화 영역: Suspense로 스트리밍할 때 사용. 있으면 userStats 대신 이 슬롯 렌더 */
  userStatsSlot?: React.ReactNode;
  userStats?: {
    jobPostsClosed30d: number;
    jobPostsOpen: number;
    applications30d: number;
    matchesCompleted30d: number;
  };
};

export default function HomeDashboard({
  tenderCount,
  tenderTodayCount,
  newsCount,
  listingsCount,
  recentListings,
  jobsOpenCount,
  latestNewsletter,
  isLoggedIn = true,
  userStatsSlot,
  userStats,
}: Props) {
  /** 비로그인 시 카드 클릭 시 로그인 후 상세 확인 유도 */
  const loginNext = (path: string) => (isLoggedIn ? path : `/login?next=${encodeURIComponent(path)}`);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80">
      <div className="mx-auto min-w-0 max-w-5xl px-3 py-8 xs:px-4 sm:px-6 sm:py-10">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            청소 입찰·거래·채용 데이터를 한 번에
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            오늘 입찰 <strong className="text-slate-800">{tenderTodayCount}건</strong> · 현장거래{" "}
            <strong className="text-slate-800">{listingsCount}건</strong> · 업계 소식{" "}
            <strong className="text-slate-800">{newsCount}건</strong>
          </p>
          <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/tenders?category=both"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              입찰 보기
            </Link>
            <Link
              href="/news"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              리포트 보기
            </Link>
          </div>
        </motion.header>

        {/* 1행: 입찰 · 인력 구인 · 업계 소식 */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <DashboardCard
            title="청소·방역 입찰 공고"
            href={loginNext("/tenders")}
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg="bg-blue-500"
            delay={0.05}
          >
            <p className="text-sm text-slate-900">등록 업종 기준</p>
            <p className="mt-0.5">
              <span className="text-xl font-bold text-slate-900">{tenderCount}건</span>
              <span className="ml-1 text-slate-900">접수 중</span>
            </p>
          </DashboardCard>

          <DashboardCard
            title="인력 구인"
            href={loginNext("/jobs")}
            icon={<UserPlus className="h-5 w-5" />}
            iconBg="bg-emerald-500"
            delay={0.1}
          >
            <p className="font-semibold text-slate-800">{jobsOpenCount}건 모집 중</p>
            <p className="mt-0.5 text-slate-500">일당·현장 구인</p>
          </DashboardCard>

          <DashboardCard
            title="업계 소식"
            href={loginNext("/news")}
            icon={<Newspaper className="h-5 w-5" />}
            iconBg="bg-violet-500"
            delay={0.15}
          >
            <p className="font-semibold text-slate-800">{newsCount}건</p>
            <p className="mt-0.5 text-slate-500">뉴스·이슈 요약</p>
          </DashboardCard>
        </section>

        {/* 2행: 현장 거래 · 견적 계산기 · 데이터 인사이트 */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <DashboardCard
            title="현장 거래"
            href={loginNext("/listings")}
            icon={<Briefcase className="h-5 w-5" />}
            iconBg="bg-amber-500"
            delay={0.2}
          >
            <p className="font-semibold text-slate-800">{listingsCount}건</p>
            {recentListings.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 text-slate-500">
                {recentListings.slice(0, 2).map((l) => (
                  <li key={l.id} className="truncate">
                    {l.title || "(제목 없음)"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-slate-500">소개·위탁 현장</p>
            )}
          </DashboardCard>

          <DashboardCard
            title="견적 계산기"
            href={loginNext("/estimate")}
            icon={<Calculator className="h-5 w-5" />}
            iconBg="bg-teal-500"
            delay={0.25}
          >
            <p className="font-semibold text-slate-800">예상 견적 산출</p>
            <p className="mt-0.5 text-slate-500">면적·인건비 기준 · 업계 단가 비교</p>
          </DashboardCard>

          <DashboardCard
            title="데이터 인사이트"
            icon={<BarChart3 className="h-5 w-5" />}
            iconBg="bg-slate-600"
            delay={0.3}
            comingSoon
          >
            <p className="text-slate-600">키즈카페·사무실 청소 평균 단가</p>
            <p className="mt-0.5 text-slate-500">출시 예정 · 구독 시 더 많은 인사이트</p>
          </DashboardCard>
        </section>

        {/* 3행: 로그인 시 내 구인 · 내 지원·매칭 (userStatsSlot이면 스트리밍, 없으면 userStats) */}
        {userStatsSlot ?? (userStats && (
          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
            >
              <Link href="/jobs/manage" className="block h-full">
                <div className={`${homeDashboardCardClass} flex h-full flex-col border-emerald-200 bg-emerald-50/50`}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold text-slate-900">내 구인 현황</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
                    <span>
                      구인중 <strong className="text-slate-900">{userStats.jobPostsOpen}</strong>건
                    </span>
                    <span>
                      구인 마감건 <strong className="text-slate-900">{userStats.jobPostsClosed30d}</strong>건
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-emerald-700">
                    확인하기
                    <ChevronRight className="ml-0.5 h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
            >
              <Link href="/jobs" className="block h-full">
                <div className={`${homeDashboardCardClass} flex h-full flex-col border-blue-200 bg-blue-50/50`}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
                      <CalendarCheck className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold text-slate-900">내 지원·매칭</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-700">
                    <span>
                      <strong className="text-slate-900">{userStats.applications30d}</strong>건 지원 /{" "}
                      <strong className="text-slate-900">{userStats.matchesCompleted30d}</strong>건 완료
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    지원 성공율{" "}
                    {userStats.applications30d > 0 ? (
                      <strong className="text-slate-900">
                        {Math.round((userStats.matchesCompleted30d / userStats.applications30d) * 100)}%
                      </strong>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-700">
                    확인하기
                    <ChevronRight className="ml-0.5 h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  );
}
