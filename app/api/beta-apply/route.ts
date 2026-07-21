import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import {
  computeBetaPainScore,
  parseAndValidateBetaApplication,
} from "@/lib/beta-application";
import { checkRateLimit } from "@/lib/rate-limit-edge";

export const runtime = "nodejs";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  const rl = await checkRateLimit("beta-apply-route", clientIp(req), 6, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (body && typeof body === "object") {
    const hp = body as { website?: string; _hp?: string };
    if ((hp.website && String(hp.website).trim()) || (hp._hp && String(hp._hp).trim())) {
      return NextResponse.json({ ok: true });
    }
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
      { status: 503 }
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
      return NextResponse.json(
        { error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("[beta-apply]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
