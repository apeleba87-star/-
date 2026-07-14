import Link from "next/link";
import type { Metadata } from "next";
import { SITE_OPERATOR } from "@/lib/site/operator";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "회사소개",
  description: `${SITE_OPERATOR.tradeName}이 운영하는 ${SITE_OPERATOR.serviceName} 소개.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-6 inline-block text-sm text-teal-800 hover:underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">회사소개</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          <strong className="text-slate-900">{SITE_OPERATOR.serviceName}</strong>는 청소·세정 현장에서
          쓰는 지식(오염·재질·제품·장소별 가이드)을 정리해 누구나 바로 찾을 수 있게 돕는 서비스입니다.
        </p>
        <p>
          본 서비스는 <strong className="text-slate-900">{SITE_OPERATOR.tradeName}</strong>(대표{" "}
          {SITE_OPERATOR.ceoName})이 운영합니다.
        </p>
        <ul className="list-inside list-disc space-y-1 text-slate-600">
          <li>사업자등록번호: {SITE_OPERATOR.businessNumber}</li>
          {SITE_OPERATOR.address ? <li>주소: {SITE_OPERATOR.address}</li> : null}
          <li>
            문의:{" "}
            <Link href="/contact" className="font-medium text-teal-800 hover:underline">
              문의하기
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
