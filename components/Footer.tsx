import Link from "next/link";

import FooterAdminLinks from "@/components/FooterAdminLinks";
import { magamLiveHref, MAGAM_LIVE_FROM_CLEANIDEX } from "@/lib/magam/live-entry";
import { siteTagline } from "@/lib/seo";
import { SITE_OPERATOR, operatorSupportEmail } from "@/lib/site/operator";

type FooterLink = { href: string; label: string };

const FOOTER_LINK_CLASS =
  "text-slate-400 hover:text-teal-300 transition-colors touch-manipulation py-1 text-xs sm:min-h-[44px] sm:py-2 sm:text-sm";

const GUIDE_LINKS: FooterLink[] = [
  { href: "/services", label: "장소별 가이드" },
  { href: "/products", label: "세정 제품" },
  { href: "/pollution", label: "오염별" },
  { href: "/inquiry/regular", label: "정기청소 문의" },
  { href: "/inquiry/move-in", label: "입주청소 문의" },
];

const CLEANING_BUSINESS_LINKS: FooterLink[] = [
  { href: "/tenders", label: "입찰 공고" },
  { href: "/estimate", label: "견적 계산기" },
  { href: magamLiveHref(MAGAM_LIVE_FROM_CLEANIDEX), label: "실시간 모집" },
];

const LEGAL_LINKS: FooterLink[] = [
  { href: "/about", label: "회사소개" },
  { href: "/contact", label: "문의" },
  { href: "/login", label: "로그인" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보 처리방침" },
];

function FooterLinkRow({ links }: { links: FooterLink[] }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-0 sm:gap-x-6 sm:gap-y-1" aria-label="푸터 링크">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={FOOTER_LINK_CLASS}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function FooterSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold text-slate-500 sm:mb-2 sm:text-xs">{title}</p>
      <FooterLinkRow links={links} />
    </div>
  );
}

export default function Footer() {
  const email = operatorSupportEmail();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-gray-900 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:py-8 sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-2xl px-3 xs:px-4 sm:px-6 lg:max-w-6xl lg:px-8">
        <div className="flex flex-col gap-3 sm:gap-5">
          <div>
            <Link href="/" className="text-sm font-semibold text-white hover:text-teal-300 transition-colors sm:text-base">
              클린아이덱스
            </Link>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block">{siteTagline}</p>
          </div>

          <details className="group sm:hidden">
            <summary className="cursor-pointer list-none text-xs text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                사이트 메뉴
                <span className="text-[10px] text-slate-600 transition-transform group-open:rotate-180">▼</span>
              </span>
            </summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[...GUIDE_LINKS, ...CLEANING_BUSINESS_LINKS].map((link) => (
                  <Link key={link.href} href={link.href} className={FOOTER_LINK_CLASS}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <FooterAdminLinks />
            </div>
          </details>

          <div className="hidden flex-col gap-4 sm:flex sm:gap-5">
            <FooterSection title="장소별·분류" links={GUIDE_LINKS} />
            <FooterSection title="청소업체 전용관" links={CLEANING_BUSINESS_LINKS} />
            <FooterAdminLinks />
          </div>

          <nav
            className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-slate-500 sm:gap-x-6 sm:text-sm"
            aria-label="푸터 정책"
          >
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-500 hover:text-teal-300 py-0 text-xs sm:py-2 sm:text-sm">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-0.5 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
            <p>
              상호 {SITE_OPERATOR.tradeName} · 대표 {SITE_OPERATOR.ceoName} · 사업자등록번호{" "}
              {SITE_OPERATOR.businessNumber}
            </p>
            <p>
              전화{" "}
              <a href={`tel:${SITE_OPERATOR.phoneTel}`} className="hover:text-teal-300">
                {SITE_OPERATOR.phoneDisplay}
              </a>
              {" · "}
              이메일{" "}
              <a href={`mailto:${email}`} className="hover:text-teal-300">
                {email}
              </a>
            </p>
            {SITE_OPERATOR.address ? <p>주소 {SITE_OPERATOR.address}</p> : null}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-600 sm:mt-6 sm:text-xs">
          © {new Date().getFullYear()} {SITE_OPERATOR.serviceName} · {SITE_OPERATOR.tradeName}
        </p>
      </div>
    </footer>
  );
}
