import { notFound } from "next/navigation";
import MaterialDetailView from "@/components/knowledge-hub/MaterialDetailView";
import { listMaterials } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getMaterialDetailData } from "@/lib/knowledge-hub/materials/get-material-detail";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateStaticParams() {
  return listMaterials().map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const data = await getMaterialDetailData(id);
  if (!data) return { title: "재질" };
  return buildPageMetadata({
    title: `${data.material.name} 표면 안전 | 클린아이덱스`,
    description: `${data.material.name} 청소 시 금기·권장·일상 관리. 오염 제거는 오염으로 찾기에서.`,
    path: `/materials/${id}`,
  });
}

export default async function MaterialDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const data = await getMaterialDetailData(id, { from });
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <MaterialDetailView data={data} />
    </main>
  );
}
