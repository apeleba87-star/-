import type { Metadata } from "next";
import Link from "next/link";

import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamDeleteAccountSection from "@/components/magam/MagamDeleteAccountSection";
import { MagamPageHeader, MagamSectionCard } from "@/components/magam/ui/MagamUi";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { magamLegalHref } from "@/lib/magam/surface";

export const metadata: Metadata = {
  title: "고객지원",
  description: `${MAGAM_APP_NAME} 이용 안내 및 문의`,
};

export default function MagamSupportPage() {
  return (
    <>
      <MagamPageHeader title="고객지원" backHref="/magam/settings" />
      <MagamAppPitch className="mb-4" taglineOnly />

      <MagamSectionCard>
        <h2 className="text-[15px] font-semibold text-[#141824]">자주 묻는 질문</h2>
        <dl className="mt-4 space-y-4 text-sm text-[#5B6472]">
          <div>
            <dt className="font-semibold text-[#141824]">공고 링크는 어디서 보나요?</dt>
            <dd className="mt-1 leading-relaxed">
              공고를 등록하면 공유 링크가 만들어집니다. 카톡·카페에 붙여넣어 공유하세요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#141824]">마감하면 연락처가 어떻게 되나요?</dt>
            <dd className="mt-1 leading-relaxed">
              마감하면 공유 링크 페이지에서 연락처가 더 이상 보이지 않습니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#141824]">계정을 삭제하려면?</dt>
            <dd className="mt-1 leading-relaxed">아래 「회원 탈퇴」에서 바로 처리할 수 있습니다.</dd>
          </div>
        </dl>
      </MagamSectionCard>

      <MagamSectionCard className="mt-3">
        <h2 className="text-[15px] font-semibold text-[#141824]">회원 탈퇴</h2>
        <MagamDeleteAccountSection />
      </MagamSectionCard>

      <p className="mt-6 text-center text-sm text-[#5B6472]">
        <Link href={magamLegalHref("/privacy")} className="underline">
          개인정보 처리방침
        </Link>
        {" · "}
        <Link href={magamLegalHref("/terms")} className="underline">
          이용약관
        </Link>
      </p>
    </>
  );
}
