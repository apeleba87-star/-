import Link from "next/link";
import type { Metadata } from "next";
import { SITE_OPERATOR, operatorSupportEmail } from "@/lib/site/operator";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "문의",
  description: `${SITE_OPERATOR.serviceName} 문의 · ${SITE_OPERATOR.tradeName}`,
  path: "/contact",
});

export default function ContactPage() {
  const email = operatorSupportEmail();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-6 inline-block text-sm text-teal-800 hover:underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">문의</h1>
      <p className="mt-3 text-sm text-slate-600">
        {SITE_OPERATOR.serviceName} 이용·제휴·개인정보 관련 문의는 아래로 연락해 주세요.
      </p>
      <dl className="mt-8 space-y-4 text-sm text-slate-700">
        <div>
          <dt className="font-bold text-slate-900">상호</dt>
          <dd className="mt-1">{SITE_OPERATOR.tradeName}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-900">대표</dt>
          <dd className="mt-1">{SITE_OPERATOR.ceoName}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-900">전화</dt>
          <dd className="mt-1">
            <a href={`tel:${SITE_OPERATOR.phoneTel}`} className="font-medium text-teal-800 hover:underline">
              {SITE_OPERATOR.phoneDisplay}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-900">이메일</dt>
          <dd className="mt-1">
            <a href={`mailto:${email}`} className="font-medium text-teal-800 hover:underline">
              {email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-900">사업자등록번호</dt>
          <dd className="mt-1">{SITE_OPERATOR.businessNumber}</dd>
        </div>
        {SITE_OPERATOR.address ? (
          <div>
            <dt className="font-bold text-slate-900">주소</dt>
            <dd className="mt-1">{SITE_OPERATOR.address}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
