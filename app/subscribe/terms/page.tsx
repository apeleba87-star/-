import Link from "next/link";

export const metadata = {
  title: "유료구독 약관",
  description: "클린아이덱스 유료구독(프리미엄·AI 블로그) 서비스 이용약관",
};

export default function SubscribeTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-6 flex flex-wrap gap-3 text-sm text-slate-600">
        <Link href="/subscribe" className="hover:underline">
          ← 프리미엄 구독
        </Link>
        <Link href="/ai-blog/subscribe" className="hover:underline">
          ← AI 블로그 구독
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-slate-900">클린아이덱스 유료구독 약관</h1>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <div>
          <h2 className="text-base font-semibold text-slate-900">제1조 (목적)</h2>
          <p className="mt-1">
            이 약관은 클린아이덱스(이하 &quot;회사&quot;)가 제공하는 유료구독 서비스의 이용조건, 결제, 자동갱신, 해지 및 환불
            등에 관한 사항을 정합니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제2조 (유료구독 서비스의 내용)</h2>
          <p className="mt-1">
            유료구독 서비스는 회사가 정한 기간 동안 다음과 같은 기능 또는 콘텐츠에 대한 접근권한을 제공합니다.
          </p>
          <p className="mt-2 font-medium text-slate-800">① 프리미엄 구독</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>프리미엄 입찰공고·데이터 조회</li>
            <li>고급 리포트·인사이트 열람</li>
            <li>고급 필터·데이터 기능</li>
            <li>A급 현장 목록, 지역별 단가, 평균 계약 금액 등</li>
            <li>기타 회사가 별도로 정한 프리미엄 기능</li>
          </ul>
          <p className="mt-3 font-medium text-slate-800">② AI 블로그 구독</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>현장 정보·사진을 바탕으로 한 AI 블로그 초안 작성</li>
            <li>문단 다시쓰기 등 AI 보조 기능</li>
            <li>네이버 블로그 등으로의 이전(옮기기) 지원</li>
            <li>요금제에 따른 월간 작성 한도 및 회사가 정한 부가 기능</li>
          </ul>
          <p className="mt-2">구체적인 제공 범위·한도·요금은 각 상품의 안내 페이지 및 결제 페이지에 따릅니다.</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제3조 (이용요금 및 결제주기)</h2>
          <p className="mt-1">
            구독상품의 명칭, 이용요금, 결제주기(월간 등)는 결제 화면에 표시된 내용에 따릅니다.
          </p>
          <p className="mt-1">
            유료구독은 결제와 동시에 이용권한이 부여되며, 별도 고지가 없는 한 <strong>매 결제주기마다 자동으로
            갱신·청구</strong>됩니다.
          </p>
          <p className="mt-1">
            회사는 신규 구독자에 한해 한시적으로 프로모션 요금(예: 첫 N개월 특가)을 적용할 수 있습니다. 적용
            요금·기간은 결제 시 화면에 표시된 내용에 따르며, 프로모션 기간 종료 후에는 정상 요금이 적용됩니다.
          </p>
          <p className="mt-1">
            이용자는 구독 페이지(및 마이페이지)에서 다음 결제 예정일, 다음 결제 금액, 프로모션 적용 여부 등 자기의
            결제 내용을 확인할 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제4조 (자동갱신)</h2>
          <p className="mt-1">
            이용자가 구독을 해지하지 않는 한, 구독은 매 결제주기 종료 시점에 동일한 조건으로 자동 연장되며 등록된
            결제수단으로 청구됩니다.
          </p>
          <p className="mt-1">
            회사는 결제 화면 및 구독 페이지에서 자동갱신 여부, 다음 결제 예정일, 다음 결제 금액, 해지 방법을
            이용자가 알기 쉽게 고지합니다.
          </p>
          <p className="mt-1">
            이용자는 구독 페이지·마이페이지 또는 회사가 제공하는 방법을 통해 언제든지{" "}
            <strong>다음 결제일부터</strong> 적용되도록 해지할 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제5조 (환불)</h2>
          <p className="mt-1">
            본 유료구독은 결제 즉시 디지털 서비스 이용이 개시되는 상품입니다. 회사의 운영 정책상{" "}
            <strong>단순 변심, 이용 중단, 중도 해지, 「몰랐다」는 사유만으로는 이미 결제된 금액을 환불하지
            않습니다.</strong>
          </p>
          <p className="mt-1">
            해지(중지)를 신청하더라도 이미 결제한 이용 기간이 끝날 때까지 서비스는 제공되며, 해당 기간에 대한 일할
            환불은 하지 않습니다. 자동결제는 다음 결제일부터 중단됩니다.
          </p>
          <p className="mt-1">다음의 경우 회사는 환불 또는 이에 준하는 조치를 할 수 있습니다.</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>결제 오류 또는 중복 결제</li>
            <li>회사의 귀책사유로 상당 기간 서비스를 제공하지 못한 경우</li>
            <li>표시·광고 내용과 현저히 다른 서비스가 제공된 경우</li>
            <li>관계 법령상 회사가 환불·청약철회에 응해야 하는 경우</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제6조 (서비스의 제한 및 변경)</h2>
          <p className="mt-1">
            회사는 운영상·기술상 필요에 따라 유료서비스의 내용, 제공 범위, 요금제 명칭을 변경할 수 있습니다.
            이용자에게 불리한 중요한 변경이 있는 경우 사전에 공지합니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제7조 (회사의 면책)</h2>
          <p className="mt-1">
            회사는 유료구독 서비스를 통해 제공하는 정보·초안·결과물이 특정 입찰 성공, 거래 성사, 매출 증가, 채용
            성과, 검색 노출·마케팅 성과 등 일정한 결과를 보장한다고 보지 않습니다.
          </p>
          <p className="mt-1">
            이용자의 사업상 판단 및 의사결정은 이용자 본인의 책임으로 이루어져야 하며, 회사는 그 결과에 책임을 지지
            않습니다.
          </p>
          <p className="mt-1">
            회사는 외부 데이터 제공처·AI 모델 제공자의 정책 변경, 데이터 지연, 서비스 장애 등 회사가 통제할 수 없는
            사유에 대해서는 책임을 지지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제8조 (해지)</h2>
          <p className="mt-1">
            이용자는 구독 기간 중 언제든지 다음 결제일부터 적용되도록 구독을 해지할 수 있습니다.
          </p>
          <p className="mt-1">
            해지하더라도 이미 결제된 기간 동안은 서비스를 계속 이용할 수 있으며, 제5조에 따른 환불 사유가 없는 한
            잔여 기간에 대한 환불은 제공되지 않습니다.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">제9조 (문의처)</h2>
          <p className="mt-1">
            유료구독 및 환불·해지 관련 문의는 서비스 내 고객문의 또는 관리자에게 문의해 주세요.
          </p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-slate-500">부칙: 본 약관은 공고일부터 시행합니다.</p>
        </div>
      </section>

      <p className="mt-8 flex flex-wrap gap-4">
        <Link href="/subscribe" className="text-sm text-amber-600 hover:underline">
          프리미엄 구독으로
        </Link>
        <Link href="/ai-blog/subscribe" className="text-sm text-sky-600 hover:underline">
          AI 블로그 구독으로
        </Link>
      </p>
    </div>
  );
}
