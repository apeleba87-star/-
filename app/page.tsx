import MoveBudgetExplorer from "@/components/move/MoveBudgetExplorer";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "클린아이덱스 — 내 예산으로 갈 수 있는 동네 찾기",
  description:
    "최근 실거래가 기준으로 전세·월세·매매 예산에 맞는 동네와 주택 유형을 찾아보세요. 이사 전 지역 선택과 입주 준비를 도와드립니다.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-8 lg:py-12">
        <MoveBudgetExplorer />
      </div>
    </main>
  );
}
