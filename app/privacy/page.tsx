import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침",
  description: "클린아이덱스 개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 홈
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">개인정보 처리방침</h1>
      <p className="mb-8 text-sm text-slate-500">
        클린아이덱스(이하 &quot;서비스&quot;)는 개인정보 보호법에 따라 이용자의 개인정보 보호 및 권익을 보장하고자 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제1조 (개인정보의 수집 및 이용 목적)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          서비스는 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 이용되지 않습니다.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>회원 가입·관리: 회원제 서비스 제공, 본인 확인, 부정 이용 방지</li>
          <li>뉴스레터·데이터랩: 구독 및 콘텐츠 제공</li>
          <li>인력 구인·현장 거래: 구인·구직·매칭, 연락처 등 제공(확정 시에 한함)</li>
          <li>입찰 공고·견적 계산기: 서비스 이용 및 통계</li>
          <li>고객 문의·민원 처리</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제2조 (수집하는 개인정보 항목)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          서비스는 서비스 제공에 필요한 최소한의 개인정보를 수집합니다.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>필수: 이메일, 비밀번호(또는 소셜 로그인 시 제공되는 식별자·이메일·닉네임·프로필 사진 등)</li>
          <li>선택: 닉네임, 연락처(인력 구인·현장 거래 이용 시)</li>
          <li>자동 수집: 접속 로그, 쿠키, 서비스 이용 기록(접속 IP, 브라우저 정보 등)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제3조 (개인정보의 보유 및 이용 기간)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          이용자의 개인정보는 수집·이용 목적이 달성된 후에는 지체 없이 파기합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>회원 정보: 회원 탈퇴 시까지(관련 법령에 따른 보존 기간이 있으면 해당 기간)</li>
          <li>계약 또는 청약 철회 등에 관한 기록: 5년(전자상거래법)</li>
          <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년</li>
          <li>접속 로그: 서비스 운영·보안을 위해 필요한 기간</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제4조 (개인정보의 제3자 제공)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 인력 구인·현장 거래 서비스에서 매칭·확정된 상대방에게 연락처 등이 제공되는 경우, 이용 동의 또는 서비스 이용약관에 따라 제공할 수 있습니다. 법령에 의한 경우(수사·조사 등)에는 해당 기관에 제공될 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제5조 (개인정보 처리의 위탁)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          서비스는 원활한 서비스 제공을 위해 필요한 범위에서 개인정보 처리 업무를 외부에 위탁할 수 있으며, 위탁 시 위탁 업무 내용과 수탁자를 이용자에게 안내합니다. 수탁자에 대한 관리·감독을 수행합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제6조 (정보주체의 권리)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          이용자는 개인정보주체로서 언제든지 열람·정정·삭제·처리정지를 요구할 수 있으며, 서비스는 이에 대해 지체 없이 조치합니다. 회원 탈퇴를 통해 삭제를 요청할 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제7조 (개인정보 보호책임자)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          서비스는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 두고 있습니다. 개인정보와 관련한 문의·불만·권리 행사는 서비스 내 문의 채널 또는 아래 연락처로 요청하실 수 있습니다.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          (담당자·연락처는 서비스 운영 정책에 따라 공지 후 기재합니다.)
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">제8조 (개인정보 처리방침의 변경)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          이 개인정보 처리방침은 법령·정책 또는 보안 기술의 변경에 따라 내용이 추가·삭제 및 수정될 수 있습니다. 변경 시 서비스 화면 또는 공지사항을 통해 공지하며, 중요한 변경 시에는 이용자에게 별도로 안내할 수 있습니다.
        </p>
      </section>

      <p className="text-xs text-slate-500">
        시행일: {new Date().toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}
