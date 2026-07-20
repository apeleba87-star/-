import MaterialsCatalog from "@/components/knowledge-hub/MaterialsCatalog";
import { listMaterials } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "재질별 청소 — 표면 안전 가이드 | 클린아이덱스",
  description:
    "타일·유리·스테인레스·대리석 등 재질별 금기·권장·일상 관리. 오염 제거는 오염으로 찾기에서.",
  path: "/materials",
});

const RISK_SORT: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  very_high: 3,
};

export default function MaterialsHubPage() {
  const materials = listMaterials()
    .slice()
    .sort((a, b) => {
      const rd = (RISK_SORT[a.riskLevel] ?? 9) - (RISK_SORT[b.riskLevel] ?? 9);
      if (rd !== 0) return rd;
      return a.name.localeCompare(b.name, "ko");
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      riskLevel: m.riskLevel,
    }));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <MaterialsCatalog materials={materials} />
        </div>
      </div>
    </main>
  );
}
