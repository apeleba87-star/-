import type { Metadata } from "next";
import Link from "next/link";

import MagamLegalPageShell from "@/components/magam/MagamLegalPageShell";
import { isMagamFromQuery } from "@/lib/magam/brand";
import { SITE_OPERATOR, operatorSupportEmail } from "@/lib/site/operator";

export const metadata: Metadata = {
  title: "이용약관",
  description: "클린아이덱스 서비스 이용약관",
};

type Props = {
  searchParams: Promise<{ from?: string }>;
};

function TermsBody() {
  const email = operatorSupportEmail();

  return (
    <>
      <p className="text-sm text-[#5B6472]">
        본 약관은 {SITE_OPERATOR.tradeName}(이하 &quot;회사&quot;)가 운영하는{" "}
        {SITE_OPERATOR.serviceName}(이하 &quot;서비스&quot;)의 이용 조건과 절차, 회사와 이용자의 권리·의무를
        규정합니다.
      </p>

      <section className="mt-8 space-y-6 text-[#5B6472]">
        <div>
          <h2 className="text-lg font-semibold text-[#141824]">1. 서비스 정의</h2>
          <p className="mt-2 text-sm leading-relaxed">
            서비스는 청소·세정 관련 가이드, 제품·오염·재질 정보, 입찰·견적·업계 정보 등 콘텐츠와 부가
            기능을 제공합니다. 서비스에서 제공되는 정보는 참고용이며, 현장 적용·구매·계약의 최종 판단은
            이용자 책임입니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">2. 약관의 효력과 변경</h2>
          <p className="mt-2 text-sm leading-relaxed">
            약관은 서비스 화면에 게시하거나 연결함으로써 효력이 발생합니다. 법령 또는 서비스 변경에 따라
            약관을 개정할 수 있으며, 중요한 변경은 서비스에 공지합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">3. 회원가입·계정</h2>
          <p className="mt-2 text-sm leading-relaxed">
            일부 기능은 회원가입 또는 로그인이 필요할 수 있습니다. 이용자는 정확한 정보를 제공하고,
            계정·비밀번호 관리 책임을 집니다. 부정 이용이 확인되면 이용을 제한할 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">4. 이용자 의무</h2>
          <p className="mt-2 text-sm leading-relaxed">
            이용자는 법령·약관·서비스 안내를 준수하며, 타인의 권리를 침해하거나 서비스 운영을 방해하는
            행위(허위 정보, 무단 수집·복제, 악성 코드 등)를 해서는 안 됩니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">5. 콘텐츠·지식재산</h2>
          <p className="mt-2 text-sm leading-relaxed">
            서비스에 게시된 문서·이미지·데이터·상표 등의 권리는 회사 또는 정당한 권리자에게 있습니다.
            무단 복제·배포·상업적 이용은 제한될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">6. 데이터·표본 고지</h2>
          <p className="mt-2 text-sm leading-relaxed">
            리포트·통계·집계 정보는 수집 시점과 표본에 따라 달라질 수 있으며, 표본이 적을 경우 참고용으로만
            제공될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">7. 책임의 제한</h2>
          <p className="mt-2 text-sm leading-relaxed">
            회사는 천재지변, 통신 장애, 이용자 귀책, 제3자 서비스 장애 등 회사의 합리적 통제 범위를 넘는
            사유로 인한 손해에 대해, 관련 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다. 서비스
            정보를 바탕으로 한 현장 작업·제품 사용·거래의 결과에 대한 최종 책임은 이용자에게 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#141824]">8. 문의·운영자</h2>
          <p className="mt-2 text-sm leading-relaxed">
            상호: {SITE_OPERATOR.tradeName}
            <br />
            대표: {SITE_OPERATOR.ceoName}
            <br />
            사업자등록번호: {SITE_OPERATOR.businessNumber}
            <br />
            전화: {SITE_OPERATOR.phoneDisplay}
            <br />
            이메일: {email}
            <br />
            {SITE_OPERATOR.address ? (
              <>
                주소: {SITE_OPERATOR.address}
                <br />
              </>
            ) : null}
            문의 페이지:{" "}
            <Link href="/contact" className="font-medium text-[#141824] underline-offset-2 hover:underline">
              /contact
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

export default async function TermsPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const fromMagam = isMagamFromQuery(from);

  if (fromMagam) {
    return (
      <MagamLegalPageShell title="이용약관">
        <TermsBody />
      </MagamLegalPageShell>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">이용약관</h1>
      <TermsBody />
    </div>
  );
}
