import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  BETA_REVIEW_STATUS_LABELS,
  type BetaReviewStatus,
} from "@/lib/beta-admin-review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(v: string): string {
  const s = v.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function arrJoin(a: string[] | null | undefined): string {
  if (!a?.length) return "";
  return a.join(" | ");
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("beta_applications")
    .select(
      "id, created_at, updated_at, applicant_name, contact, phone, industry, employee_band, record_management, pain_experiences, dispute_last_year, desired_features, biggest_pain, availability, consent_personal, pain_score, source_path, review_status, review_tags, admin_note",
    )
    .order("pain_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("[beta csv]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "id",
    "created_at",
    "updated_at",
    "review_status",
    "review_status_ko",
    "pain_score",
    "applicant_name",
    "contact",
    "phone",
    "industry",
    "employee_band",
    "record_management",
    "dispute_last_year",
    "availability",
    "review_tags",
    "admin_note",
    "pain_experiences",
    "desired_features",
    "biggest_pain",
    "source_path",
    "consent_personal",
  ];

  const lines = [headers.join(",")];
  for (const r of rows ?? []) {
    const row = r as Record<string, unknown>;
    const st = (row.review_status as string) || "new";
    const stKo =
      BETA_REVIEW_STATUS_LABELS[st as BetaReviewStatus] ??
      st;
    const vals = [
      csvCell(String(row.id ?? "")),
      csvCell(String(row.created_at ?? "")),
      csvCell(String(row.updated_at ?? "")),
      csvCell(st),
      csvCell(stKo),
      csvCell(String(row.pain_score ?? "")),
      csvCell(String(row.applicant_name ?? "")),
      csvCell(String(row.contact ?? "")),
      csvCell(String(row.phone ?? "")),
      csvCell(String(row.industry ?? "")),
      csvCell(String(row.employee_band ?? "")),
      csvCell(String(row.record_management ?? "")),
      csvCell(String(row.dispute_last_year ?? "")),
      csvCell(String(row.availability ?? "")),
      csvCell(arrJoin(row.review_tags as string[])),
      csvCell(String(row.admin_note ?? "")),
      csvCell(arrJoin(row.pain_experiences as string[])),
      csvCell(arrJoin(row.desired_features as string[])),
      csvCell(String(row.biggest_pain ?? "")),
      csvCell(String(row.source_path ?? "")),
      csvCell(row.consent_personal === true ? "true" : "false"),
    ];
    lines.push(vals.join(","));
  }

  const body = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="beta-applications-${date}.csv"`,
    },
  });
}
