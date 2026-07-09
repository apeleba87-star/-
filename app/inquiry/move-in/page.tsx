import { Suspense } from "react";
import InquiryForm from "@/components/knowledge-hub/InquiryForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "입주청소 견적 문의 | 클린아이덱스",
  description: "입주청소·이사 청소 견적을 문의하세요.",
  path: "/inquiry/move-in",
});

export default function InquiryMoveInPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-12">
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Suspense>
            <InquiryForm
              inquiryType="move_in"
              title="입주청소 견적 문의"
              description="입주 예정일·지역·연락처를 남겨 주세요."
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
