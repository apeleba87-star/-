import Link from "next/link";
import { notFound } from "next/navigation";
import AdminQuestionTagsForm from "@/app/admin/questions/AdminQuestionTagsForm";
import {
  listContaminants,
  listMaterials,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { questionPath } from "@/lib/questions/constants";
import { getAdminQuestionById } from "@/lib/questions/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminQuestionEditPage({ params }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const data = await getAdminQuestionById(id);
  if (!data) notFound();

  const { question: q, links, author_display_name } = data;

  const products = (await listMergedProducts())
    .filter((p) => p.status !== "draft")
    .map((p) => ({ id: p.id, label: p.name, hint: p.brand }));
  const contaminants = listContaminants().map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const materials = listMaterials().map((m) => ({ id: m.id, label: m.name }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/questions" className="font-bold text-teal-800 hover:underline">
          ← 질문 목록
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">질문 태그 · #{q.id}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {author_display_name ?? "회원"} · {q.status}
        {q.deleted_at ? " · 삭제됨" : ""}
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Link
          href={questionPath(q.id, q.slug)}
          className="font-bold text-slate-900 hover:underline"
        >
          {q.title}
        </Link>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {q.body}
        </p>
      </div>

      <div className="mt-6">
        <AdminQuestionTagsForm
          questionId={q.id}
          initial={links.map((l) => ({ type: l.entity_type, id: l.entity_id }))}
          products={products}
          contaminants={contaminants}
          materials={materials}
        />
      </div>
    </div>
  );
}
