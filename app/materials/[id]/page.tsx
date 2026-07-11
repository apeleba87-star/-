import { notFound } from "next/navigation";
import KnowledgeDbPageView from "@/components/knowledge-hub/KnowledgeDbPageView";
import ProInquiryCta from "@/components/knowledge-hub/ProInquiryCta";
import { getMaterialById, listMaterials } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { generateMaterialPageBody } from "@/lib/knowledge-hub/generate-from-db";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return listMaterials().map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const material = getMaterialById(id);
  if (!material) return { title: "재질" };
  return buildPageMetadata({
    title: `${material.name} 청소 방법 | 클린아이덱스`,
    description: `${material.name} 세정 시 주의사항과 연결 레시피.`,
    path: `/materials/${id}`,
  });
}

export default async function MaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const material = getMaterialById(id);
  const body = generateMaterialPageBody(id);
  if (!material || !body) notFound();

  return (
    <div className="px-4 py-10">
      <KnowledgeDbPageView
        h1={material.name}
        badge="재질별 청소"
        intro={body.intro}
        body={body}
        breadcrumb={[{ href: "/materials", label: "재질별 청소" }]}
        footer={<ProInquiryCta path={`/materials/${id}`} materialId={id} className="mt-10" />}
      />
    </div>
  );
}
