import MoveBudgetExplorer from "@/components/move/MoveBudgetExplorer";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "내 예산으로 어디까지 갈 수 있을까? — 실거래가 기반 이사검색",
  description:
    "전세·월세·매매 예산을 입력하면 최근 실거래가 기준으로 갈 수 있는 동네와 주택 유형을 찾아드립니다.",
  path: "/move",
});

export const revalidate = 3600;

export default function MoveBudgetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-8 lg:py-12">
        <MoveBudgetExplorer />
      </div>
    </main>
  );
}
