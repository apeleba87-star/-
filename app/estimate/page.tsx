import { getEstimateConfig } from "@/lib/estimate-config";
import CleaningEstimateCalculator from "@/components/estimate/CleaningEstimateCalculator";

export const revalidate = 60;

export default async function EstimatePage() {
  const config = await getEstimateConfig();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">청소업 견적 진단기</h1>
      <p className="mb-6 text-sm text-slate-600">면적·인건비 기준으로 예상 견적을 산출하고 업계 평균과 비교해 보세요.</p>
      <CleaningEstimateCalculator config={config} />
    </div>
  );
}
