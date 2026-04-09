"use client";

import Image from "next/image";
import { useState } from "react";
import { Calendar, ImageIcon, LayoutList, MapPin, Quote, Shield } from "lucide-react";
import PartnerContactButton from "@/components/partners/PartnerContactButton";
import PartnerSidebarActions from "@/components/partners/PartnerSidebarActions";

export type PartnerDetailPortfolioItem = {
  id: string;
  title: string;
  caption: string | null;
  sort_order: number;
  thumbUrl: string;
  displayUrl: string;
  isExternal?: boolean;
};

export type PartnerDetailPriceRow = {
  item_name: string;
  unit: string | null;
  note: string | null;
  base_price: number;
  sort_order: number;
};

type TabId = "intro" | "prices" | "portfolio";

type Props = {
  companyId: string;
  companyName: string;
  businessVerified: boolean;
  categoryLabels: string[];
  regionLabels: string[];
  oneLiner: string | null;
  contactName: string;
  workScope: string | null;
  mainImageUrl: string | null;
  homepageUrl: string | null;
  snsUrl: string | null;
  priceRows: PartnerDetailPriceRow[];
  portfolioItems: PartnerDetailPortfolioItem[];
  initialFavorited: boolean;
  isLoggedIn: boolean;
};

const tabs: { id: TabId; label: string }[] = [
  { id: "intro", label: "소개" },
  { id: "prices", label: "가격표" },
  { id: "portfolio", label: "포트폴리오" },
];

/** 탭 전환 시 카드 높이가 들쭉날쭉하지 않도록 본문 영역 최소 높이 통일 */
const TAB_PANEL_MIN_H = "min-h-[28rem] sm:min-h-[32rem] lg:min-h-[36rem]";

function InfoCell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold leading-snug ${muted ? "text-slate-400" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function PartnerDetailShell({
  companyId,
  companyName,
  businessVerified,
  categoryLabels,
  regionLabels,
  oneLiner,
  contactName,
  workScope,
  mainImageUrl,
  homepageUrl,
  snsUrl,
  priceRows,
  portfolioItems,
  initialFavorited,
  isLoggedIn,
}: Props) {
  const [tab, setTab] = useState<TabId>("intro");

  const subtitleParts: string[] = [];
  if (categoryLabels.length) subtitleParts.push(categoryLabels.join(" · "));
  if (regionLabels.length) subtitleParts.push(regionLabels.join(" · "));
  const subtitle = subtitleParts.join(" · ");

  const sortedPortfolio = portfolioItems.slice().sort((a, b) => a.sort_order - b.sort_order);

  const businessLabel = businessVerified ? "등록 확인 완료" : "미확인";

  return (
    <div className="pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:grid lg:grid-cols-[1fr_280px] lg:items-stretch lg:gap-10 lg:pb-0">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="aspect-[16/8] overflow-hidden bg-slate-100">
            {mainImageUrl ? (
              <img src={mainImageUrl} alt={`${companyName} 대표 이미지`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">이미지 준비중</div>
            )}
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{companyName}</h2>
                {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {businessVerified ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                    사업자 확인
                  </span>
                ) : null}
                {categoryLabels.map((label) => (
                  <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                    tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={`${TAB_PANEL_MIN_H} pt-1`}>
            {tab === "intro" ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/40 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    <Quote className="h-4 w-4 shrink-0" aria-hidden />
                    한 줄 소개
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">{oneLiner ?? "소개 문구를 준비 중입니다."}</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Shield className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                    업체 정보
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <InfoCell label="대표자" value={contactName} />
                    <InfoCell label="사업자 정보" value={businessLabel} muted={!businessVerified} />
                    <InfoCell label="설립일" value="추후 공개" muted />
                    <InfoCell label="보유 인력" value="추후 공개" muted />
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                      활동 가능 지역
                    </div>
                    {regionLabels.length === 0 ? (
                      <p className="text-sm text-slate-400">미등록</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {regionLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                      작업 가능 범위
                    </div>
                    <p className="text-sm font-medium text-slate-900 sm:text-right sm:max-w-[65%]">{workScope ?? "준비 중"}</p>
                  </div>
                </div>

                {homepageUrl || snsUrl ? (
                  <div className="flex flex-wrap gap-3 text-sm">
                    {homepageUrl ? (
                      <a
                        href={homepageUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-800"
                      >
                        홈페이지
                      </a>
                    ) : null}
                    {snsUrl ? (
                      <a
                        href={snsUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-800"
                      >
                        SNS
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "prices" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-800">
                    <LayoutList className="h-4 w-4 text-slate-500" aria-hidden />
                    <span className="text-sm font-semibold">기본 단가표</span>
                  </div>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                    VAT 포함
                  </span>
                </div>
                <p className="text-xs text-slate-500">* 현장 상황에 따라 가격이 조정될 수 있습니다.</p>
                {priceRows.length === 0 ? (
                  <p className="text-sm text-slate-500">등록된 단가가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {priceRows.map((price) => (
                      <li
                        key={`${price.item_name}-${price.sort_order}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                      >
                        <p className="text-sm text-slate-700">
                          {price.item_name}
                          {price.unit ? ` (${price.unit})` : ""}
                          {price.note ? ` · ${price.note}` : ""}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          {Number(price.base_price).toLocaleString("ko-KR")}원 (VAT 포함)
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {tab === "portfolio" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ImageIcon className="h-4 w-4 text-slate-500" aria-hidden />
                  최근 작업 사례
                </div>
                {sortedPortfolio.length === 0 ? (
                  <p className="text-sm text-slate-500">등록된 포트폴리오가 없습니다.</p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {sortedPortfolio.map((p) => (
                      <li key={p.id} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40 shadow-sm">
                        <a href={p.displayUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <div className="relative aspect-[4/3] bg-slate-200">
                            {p.isExternal ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.thumbUrl}
                                alt={p.title}
                                className="h-full w-full object-cover transition hover:opacity-95"
                              />
                            ) : (
                              <Image
                                src={p.thumbUrl}
                                alt={p.title}
                                fill
                                className="object-cover transition hover:opacity-95"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                            {p.caption ? <p className="mt-1 text-xs text-slate-600 line-clamp-2">{p.caption}</p> : null}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            </div>
          </div>
        </section>
      </div>

      <aside className="mt-10 lg:mt-0">
        <div className="space-y-4 lg:sticky lg:top-[clamp(5.5rem,22vh,11rem)] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:space-y-4">
          <PartnerSidebarActions
            companyId={companyId}
            companyName={companyName}
            initialFavorited={initialFavorited}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </aside>

      {/* 모바일: 스크롤 위치와 무관하게 연락하기 노출 (문의 전환용) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85 lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <PartnerContactButton companyId={companyId} variant="emerald" fullWidth />
        </div>
      </div>
    </div>
  );
}
