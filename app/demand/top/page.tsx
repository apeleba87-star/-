import DemandShell from "@/components/demand/DemandShell";
import DemandRankRow from "@/components/demand/DemandRankRow";
import { DEMAND_TOP10 } from "@/lib/demand/dummy-data";

export const metadata = {
  title: "입주수요 TOP10 | 클린아이덱스",
};

export default function DemandTopPage() {
  return (
    <DemandShell title="TOP10" subtitle={undefined}>
      <ul className="space-y-2">
        {DEMAND_TOP10.map((d) => (
          <li key={d.slug}>
            <DemandRankRow district={d} />
          </li>
        ))}
      </ul>
    </DemandShell>
  );
}
