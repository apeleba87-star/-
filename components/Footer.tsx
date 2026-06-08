import Link from "next/link";
import FooterAdminLinks from "@/components/FooterAdminLinks";
import { siteTagline } from "@/lib/seo";

type FooterLink = { href: string; label: string };

const FOOTER_LINK_CLASS =
  "text-slate-400 hover:text-teal-300 transition-colors touch-manipulation py-1 text-xs sm:min-h-[44px] sm:py-2 sm:text-sm";

const PUBLIC_PRIMARY_LINKS: FooterLink[] = [
  { href: "/", label: "입주레이더" },
  { href: "/tenders", label: "입찰 공고" },
  { href: "/tender-awards", label: "낙찰 공고" },
  { href: "/jobs/public", label: "채용 공고" },
  { href: "/estimate", label: "견적 계산기" },
];

const REPORT_LINKS: FooterLink[] = [
  { href: "/news?section=report&category=report", label: "입찰 리포트" },
  { href: "/news?section=report&category=award_report", label: "낙찰 리포트" },
  { href: "/marketing-report", label: "마케팅 리포트" },
  { href: "/job-market-report", label: "일당 리포트" },
];

const LEGAL_LINKS: FooterLink[] = [
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

export default function Footer() {
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
                {[...PUBLIC_PRIMARY_LINKS, ...REPORT_LINKS].map((link) => (
                  <Link key={link.href} href={link.href} className={FOOTER_LINK_CLASS}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <FooterAdminLinks />
            </div>
          </details>

          <div className="hidden flex-col gap-4 sm:flex sm:gap-5">
            <FooterLinkRow links={PUBLIC_PRIMARY_LINKS} />
            <FooterLinkRow links={REPORT_LINKS} />
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
        </div>

        <p className="mt-3 text-[11px] text-slate-600 sm:mt-6 sm:text-xs">
          © {new Date().getFullYear()} 클린아이덱스
        </p>
      </div>
    </footer>
  );
}
