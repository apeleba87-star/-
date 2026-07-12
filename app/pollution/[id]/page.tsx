import { notFound } from "next/navigation";
import KnowledgeDbPageView from "@/components/knowledge-hub/KnowledgeDbPageView";
import ProInquiryCta from "@/components/knowledge-hub/ProInquiryCta";
import {
  getContaminantById,
  listContaminants,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { CONTAMINANT_TYPE_KO } from "@/lib/knowledge-hub/korean-labels";
import { generateContaminantPageBody } from "@/lib/knowledge-hub/generate-from-db";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return listContaminants().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const contaminant = getContaminantById(id);
  if (!contaminant) return { title: "오염" };
  return buildPageMetadata({
    title: `${contaminant.name} 제거 방법 | 클린아이덱스`,
    description: `${contaminant.name} 제거 원칙과 연결 레시피.`,
    path: `/pollution/${id}`,
  });
}

export default async function PollutionDetailPage({ params }: Props) {
  const { id } = await params;
  const contaminant = getContaminantById(id);
  const body = generateContaminantPageBody(id);
  if (!contaminant || !body) notFound();

  const typeLabel = CONTAMINANT_TYPE_KO[contaminant.type] ?? contaminant.type;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <KnowledgeDbPageView
          h1={contaminant.name}
          badge={`오염별 · ${typeLabel}`}
          summary={body.summary}
          body={body}
          breadcrumb={[{ href: "/pollution", label: "오염별" }]}
          footer={<ProInquiryCta path={`/pollution/${id}`} contaminantId={id} className="mt-10" />}
        />
      </div>
    </main>
  );
}
