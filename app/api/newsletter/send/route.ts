import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: items } = await supabase
    .from("newsletter_queue")
    .select("id, type, title, summary, content_html, ref_type, ref_id")
    .is("used_in_issue_id", null)
    .lte("scheduled_for", new Date().toISOString().slice(0, 10))
    .order("sort_order");

  if (!items?.length) {
    return NextResponse.json({ ok: false, error: "발송할 큐 항목이 없습니다." }, { status: 400 });
  }

  const subject = `클린인덱스 ${new Date().toLocaleDateString("ko-KR")} 요약`;
  const parts: string[] = items.map(
    (i) => `<section style="margin:1em 0"><h3>${i.title || "제목 없음"}</h3>${i.summary ? `<p>${i.summary}</p>` : ""}${i.content_html || ""}</section>`
  );
  const bodyHtml = `<div>${parts.join("")}</div>`;

  const { data: issue, error: issueErr } = await supabase
    .from("newsletter_issues")
    .insert({
      subject,
      summary: `총 ${items.length}개 항목`,
      body_html: bodyHtml,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (issueErr || !issue) {
    return NextResponse.json({ ok: false, error: issueErr?.message || "이슈 생성 실패" }, { status: 500 });
  }

  await supabase
    .from("newsletter_queue")
    .update({ used_in_issue_id: issue.id })
    .in("id", items.map((i) => i.id));

  return NextResponse.json({
    ok: true,
    message: "뉴스레터 회차가 생성되었습니다. (이메일 발송은 Resend 등 연동 후 가능)",
    issueId: issue.id,
  });
}
