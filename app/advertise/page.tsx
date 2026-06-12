import type { Metadata } from "next";
import Link from "next/link";
import RadarAdInquiryForm from "@/components/advertise/RadarAdInquiryForm";
import RadarAdPlacementExplorer from "@/components/advertise/RadarAdPlacementExplorer";
import { getRadarAdInquiryPreviewContext } from "@/lib/advertise/preview-context";
import { RADAR_AD_IMAGE_SPEC } from "@/lib/demand/radar-ads-shared";

export const metadata: Metadata = {
  title: "배너 광고 문의 — 입주레이더",
  description:
    "입주레이더·채용·일당 리포트 배너 광고 노출 지면을 확인하고 전국·지역 직거래 광고 문의를 남기세요.",
};

export default async function AdvertisePage() {
  const previewContext = await getRadarAdInquiryPreviewContext();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">
            Sponsored · 직거래 배너
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            배너 광고 문의
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            청소·용역 업계가 매일 쓰는 <strong className="font-semibold text-slate-800">입주레이더</strong>,{" "}
            <strong className="font-semibold text-slate-800">채용</strong>,{" "}
            <strong className="font-semibold text-slate-800">일당 리포트</strong> 화면에 3:1 배너로
            노출됩니다. 아래에서 <strong className="font-semibold text-slate-800">어디에 붙는지</strong>{" "}
            확인한 뒤 문의해 주세요.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            이미지 권장 {RADAR_AD_IMAGE_SPEC.adminSummary} · 배너당 슬롯 5개 로테이션
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <RadarAdPlacementExplorer previewContext={previewContext} />
        </div>

        <div
          id="inquiry"
          className="mx-auto mt-14 max-w-2xl scroll-mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">문의하기</h2>
          <p className="mt-1 text-sm text-slate-600">
            접수 후 담당자가 연락드립니다. 계약·소재 등록은 별도 안내드립니다.
          </p>
          <div className="mt-6">
            <RadarAdInquiryForm />
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-teal-700 hover:underline">
            입주레이더
          </Link>
          {" · "}
          <Link href="/jobs/public" className="font-medium text-teal-700 hover:underline">
            채용
          </Link>
          {" · "}
          <Link href="/job-market-report" className="font-medium text-teal-700 hover:underline">
            일당 리포트
          </Link>
        </p>
      </div>
    </div>
  );
}
