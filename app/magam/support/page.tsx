import type { Metadata } from "next";
import Link from "next/link";

import MagamAppPitch from "@/components/magam/MagamAppPitch";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { magamSupportEmail } from "@/lib/magam/support";

export const metadata: Metadata = {
  title: `${MAGAM_APP_NAME} 고객지원`,
  description: `${MAGAM_APP_NAME} 앱 이용 안내 및 문의`,
};

export default function MagamSupportPage() {
  const email = magamSupportEmail();
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`[${MAGAM_APP_NAME}] 문의`)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{MAGAM_APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">고객지원</h1>
      <MagamAppPitch className="mt-2" />

      <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">자주 묻는 질문</h2>
        <dl className="space-y-4 text-sm text-slate-700">
          <div>
            <dt className="font-semibold text-slate-900">공고 링크는 어디서 보나요?</dt>
            <dd className="mt-1 leading-relaxed">
              앱에서 공고를 등록하면 공유 링크가 만들어집니다. 카톡·카페에 붙여넣어 공유하세요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">마감하면 연락처가 어떻게 되나요?</dt>
            <dd className="mt-1 leading-relaxed">
              마감하면 공유 링크 페이지에서 연락처가 더 이상 보이지 않습니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">계정을 삭제하려면?</dt>
            <dd className="mt-1 leading-relaxed">
              앱 <strong>설정</strong> → <strong>회원 탈퇴</strong>에서 바로 삭제할 수 있습니다. 클린아이덱스
              웹과 같은 로그인을 쓰는 경우 웹 이용도 함께 종료됩니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">부적절한 공고를 신고하려면?</dt>
            <dd className="mt-1 leading-relaxed">
              아래 이메일로 공고 링크와 신고 사유를 보내 주세요. 검토 후 조치합니다.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">문의하기</h2>
        <p className="mt-2 text-sm text-slate-600">
          앱 오류, 계정·개인정보, 공고 신고 등은 이메일로 연락해 주세요.
        </p>
        <a
          href={mailto}
          className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {email} 로 문의
        </a>
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          개인정보 처리방침
        </Link>
        {" · "}
        <Link href="/terms" className="underline-offset-2 hover:underline">
          이용약관
        </Link>
      </p>
    </div>
  );
}
