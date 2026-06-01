import DemandShell from "@/components/demand/DemandShell";
import DemandHitCard from "@/components/demand/DemandHitCard";
import { DEMAND_HITS } from "@/lib/demand/dummy-data";

export const metadata = {
  title: "선행 신호 적중 | 입주수요 | 클린아이덱스",
};

export default function DemandHitsPage() {
  return (
    <DemandShell
      title="선행 신호 적중 아카이브"
      subtitle="과거에 선행 지표가 후행 지표를 맞춘 사례를 모았습니다. 검증된 카드만 표시합니다."
    >
      <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/80">
        포장이사 → 입주청소 약 1개월 선행은 <strong>가설</strong>이며, 5구·36개월 백테스트로 계속
        업데이트합니다.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMAND_HITS.map((h) => (
          <DemandHitCard key={h.id} hit={h} />
        ))}
      </div>
    </DemandShell>
  );
}
