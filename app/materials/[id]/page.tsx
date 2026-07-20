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
    title: `${material.name} 표면 안전 | 클린아이덱스`,
    description: `${material.name} 청소 시 금기·권장·일상 관리. 오염 제거는 오염으로 찾기에서.`,
    path: `/materials/${id}`,
  });
}

export default async function MaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const material = getMaterialById(id);
  const body = await generateMaterialPageBody(id);
  if (!material || !body) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <KnowledgeDbPageView
          h1={material.name}
          badge="재질 · 표면 안전"
          intro={body.intro}
          riskLevel={material.riskLevel}
          summary={body.summary}
          body={body}
          breadcrumb={[{ href: "/materials", label: "재질별 청소" }]}
          footer={<ProInquiryCta path={`/materials/${id}`} materialId={id} className="mt-10" />}
        />
      </div>
    </main>
  );
}
