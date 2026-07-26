import { createServerSupabase } from "@/lib/supabase-server";
import CleaningInquiriesPanel, {
  type CleaningInquiryRow,
} from "./CleaningInquiriesPanel";
import type { CleaningInquiryStatus } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; status?: string }>;

function parseType(v: string | undefined): "regular" | "move_in" | null {
  if (v === "regular" || v === "move_in") return v;
  return null;
}

function parseStatus(v: string | undefined): CleaningInquiryStatus | null {
  if (v === "pending" || v === "contacted" || v === "closed") return v;
  return null;
}

export default async function AdminCleaningInquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const typeFilter = parseType(params.type?.trim());
  const statusFilter = parseStatus(params.status?.trim());

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-red-600">로그인이 필요합니다.</p>;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return <p className="text-red-600">권한이 없습니다.</p>;
  }

  const { data: rows, error } = await supabase
    .from("cleaning_inquiries")
    .select(
      "id, created_at, inquiry_type, service_slug, region, phone, message, ref_slug, ref_path, status"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">견적 문의</h1>
        <p className="text-red-600">
          불러오지 못했습니다. Supabase 마이그레이션{" "}
          <code className="rounded bg-slate-100 px-1">189_knowledge_hub_cleaning_guides</code> 적용
          여부를 확인해 주세요.
        </p>
        <p className="mt-2 font-mono text-sm text-slate-600">{error.message}</p>
      </div>
    );
  }

  const list = (rows ?? []) as CleaningInquiryRow[];
  const pendingCount = list.filter((r) => r.status === "pending").length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">견적 문의</h1>
      <p className="mb-6 text-sm text-slate-600">
        정기·입주 청소 견적 접수 목록입니다.{" "}
        <a
          href="/inquiry/regular"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-teal-700 hover:underline"
        >
          /inquiry/regular
        </a>
        {" · "}
        <a
          href="/inquiry/move-in"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-teal-700 hover:underline"
        >
          /inquiry/move-in
        </a>
        {!typeFilter && !statusFilter ? ` · 대기 ${pendingCount}건` : null}
      </p>
      <CleaningInquiriesPanel rows={list} typeFilter={typeFilter} statusFilter={statusFilter} />
    </div>
  );
}
