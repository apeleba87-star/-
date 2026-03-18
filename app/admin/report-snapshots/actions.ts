"use server";

import { revalidatePath } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import { reportContentToMarkdown } from "@/lib/content/snapshot-to-post-body";

export type PublishSnapshotResult =
  | { ok: true; postId: string; message: string }
  | { ok: false; error: string };

/**
 * 리포트 스냅샷을 글로 발행. post 생성 또는 기존 post 업데이트 후 published_post_id 연결.
 */
export async function publishReportSnapshot(snapshotId: string): Promise<PublishSnapshotResult> {
  const supabase = createServiceSupabase();

  const { data: snapshot, error: fetchErr } = await supabase
    .from("report_snapshots")
    .select("id, report_type, period_key, title, content_full, content_summary, content_social, published_post_id")
    .eq("id", snapshotId)
    .single();

  if (fetchErr || !snapshot) {
    return { ok: false, error: "스냅샷을 찾을 수 없습니다." };
  }

  const content = (snapshot.content_full ?? snapshot.content_summary) as Record<string, unknown> | null;
  if (!content || typeof content !== "object") {
    return { ok: false, error: "스냅샷 본문이 없습니다." };
  }

  const headline = (content.headline as string) ?? snapshot.title;
  const body = reportContentToMarkdown(content as Parameters<typeof reportContentToMarkdown>[0]);
  const slug = `report-${(snapshot.report_type as string).replace(/_/g, "-")}-${String(snapshot.period_key).replace(/\s/g, "-")}`;

  if (snapshot.published_post_id) {
    const { error: updateErr } = await supabase
      .from("posts")
      .update({
        title: snapshot.title,
        body,
        excerpt: headline,
        report_snapshot: content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshot.published_post_id);

    if (updateErr) {
      return { ok: false, error: `글 수정 실패: ${updateErr.message}` };
    }
    revalidatePath("/admin/report-snapshots");
    revalidatePath("/news");
    return { ok: true, postId: snapshot.published_post_id, message: "기존 글이 업데이트되었습니다." };
  }

  const { data: post, error: insertErr } = await supabase
    .from("posts")
    .insert({
      title: snapshot.title,
      slug,
      body,
      excerpt: headline,
      newsletter_include: false,
      published_at: null,
      source_type: snapshot.report_type,
      source_ref: snapshot.period_key,
      report_snapshot: content,
    })
    .select("id")
    .single();

  if (insertErr) {
    return { ok: false, error: `글 생성 실패: ${insertErr.message}` };
  }

  const { error: linkErr } = await supabase
    .from("report_snapshots")
    .update({ published_post_id: post.id, updated_at: new Date().toISOString() })
    .eq("id", snapshotId);

  if (linkErr) {
    return { ok: false, error: `스냅샷 연결 실패: ${linkErr.message}` };
  }

  revalidatePath("/admin/report-snapshots");
  revalidatePath("/news");
  return {
    ok: true,
    postId: post.id,
    message: `${getReportTypeLabel(snapshot.report_type as string)} 글이 생성되었습니다. 글 관리에서 확인·발행하세요.`,
  };
}
