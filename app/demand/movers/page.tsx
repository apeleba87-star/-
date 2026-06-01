import DemandShell from "@/components/demand/DemandShell";
import DemandMoverRow from "@/components/demand/DemandMoverRow";
import { DEMAND_MOVERS } from "@/lib/demand/dummy-data";

export const metadata = {
  title: "급상승 지역 | 입주수요 | 클린아이덱스",
};

export default function DemandMoversPage() {
  return (
    <DemandShell
      title="급상승 지역"
      subtitle="순위 변화가 큰 구부터 확인하세요. 왜 갑자기 올랐는지 상세에서 볼 수 있습니다."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {DEMAND_MOVERS.map((d) => (
          <li key={d.slug}>
            <DemandMoverRow district={d} />
          </li>
        ))}
      </ul>
    </DemandShell>
  );
}
