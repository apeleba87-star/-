import { Suspense } from "react";
import InquiryForm from "@/components/knowledge-hub/InquiryForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "정기청소 견적 문의 | 클린아이덱스",
  description: "사무실·상가·계단 정기청소 견적을 문의하세요.",
  path: "/inquiry/regular",
});

export default function InquiryRegularPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-12">
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Suspense>
            <InquiryForm
              inquiryType="regular"
              title="정기청소 견적 문의"
              description="지역과 연락처를 남겨 주시면 견적을 안내해 드립니다."
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
