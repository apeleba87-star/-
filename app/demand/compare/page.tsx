import { Suspense } from "react";
import DemandShell from "@/components/demand/DemandShell";
import DemandCompareTable from "@/components/demand/DemandCompareTable";

export const metadata = {
  title: "지역 비교 | 입주수요 | 클린아이덱스",
};

function CompareFallback() {
  return (
    <div className="h-48 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
  );
}

export default function DemandComparePage() {
  return (
    <DemandShell
      title="비교"
      subtitle={undefined}
    >
      <Suspense fallback={<CompareFallback />}>
        <DemandCompareTable />
      </Suspense>
    </DemandShell>
  );
}
