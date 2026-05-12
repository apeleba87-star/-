import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import {
  computeBetaPainScore,
  parseAndValidateBetaApplication,
} from "@/lib/beta-application";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = parseAndValidateBetaApplication(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const pain_score = computeBetaPainScore(parsed.data);
  const d = parsed.data;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "지원 접수 시스템이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  try {
    const supabase = createServiceSupabase();
    const { error } = await supabase.from("beta_applications").insert({
      applicant_name: d.applicantName,
      contact: d.contact,
      phone: d.phone,
      industry: d.industry,
      employee_band: d.employeeBand,
      record_management: d.recordManagement,
      pain_experiences: d.painExperiences,
      dispute_last_year: d.disputeLastYear,
      desired_features: d.desiredFeatures,
      biggest_pain: d.biggestPain,
      availability: d.availability,
      consent_personal: d.consentPersonal,
      pain_score,
      source_path: "/beta",
    });

    if (error) {
      console.error("[beta-apply]", error);
      return NextResponse.json({ error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
  } catch (e) {
    console.error("[beta-apply]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
