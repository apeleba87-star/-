import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "클린아이덱스 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">이용약관</h1>
      <p className="mt-2 text-sm text-slate-600">
        본 문서는 서비스 이용에 필요한 기본 사항을 안내합니다. 자세한 법적 조건은 서비스 운영 정책에 따라 추가될 수 있습니다.
      </p>

      <section className="mt-8 space-y-6 text-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. 서비스 정의</h2>
          <p className="mt-2 text-sm leading-relaxed">
            클린아이덱스는 청소·방역 관련 입찰/현장/업계 정보를 기반으로 사용자의 검토를 돕는 콘텐츠를 제공하는 서비스입니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. 이용자 책임</h2>
          <p className="mt-2 text-sm leading-relaxed">
            사용자는 서비스에서 제공되는 정보의 정확성/적합성을 본인 책임 하에 확인하고, 최종 의사결정에 대한 책임은 사용자에게 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. 데이터/표본 고지</h2>
          <p className="mt-2 text-sm leading-relaxed">
            리포트 및 통계는 수집·집계 시점에 따라 달라질 수 있으며, 표본 수가 적은 경우 참고용으로 제공될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. 책임 제한</h2>
          <p className="mt-2 text-sm leading-relaxed">
            서비스 제공과 관련하여 발생할 수 있는 손해에 대해, 관련 법령이 허용하는 범위 내에서 책임이 제한될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">5. 연락</h2>
          <p className="mt-2 text-sm leading-relaxed">
            서비스 이용 중 문의사항이 있으면 고객문의 채널을 통해 문의해 주세요.
          </p>
        </div>
      </section>
    </div>
  );
}

