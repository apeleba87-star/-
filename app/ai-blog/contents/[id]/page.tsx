import { notFound, redirect } from "next/navigation";
import ContentWorkspace from "@/components/ai-blog/ContentWorkspace";
import { buildKnowledgeContext } from "@/lib/ai-blog/knowledge-context";
import {
  CONTENT_SELECT,
  getAiBlogUser,
  isUuid,
  loadProfile,
  loadProjectBundle,
  loadUsage,
} from "@/lib/ai-blog/server";
import type { Content } from "@/lib/ai-blog/types";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const got = await getAiBlogUser();
  if (!got) redirect(`/login?next=/ai-blog/contents/${id}`);
  if (!got.user.companyId) redirect("/ai-blog/profile?welcome=1");

  const { data: content } = await got.supabase
    .schema("cleanidex")
    .from("contents")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Content>();
  if (!content) notFound();

  const [bundle, profile, usage] = await Promise.all([
    loadProjectBundle(got.supabase, content.project_id),
    loadProfile(got.supabase, got.user.companyId),
    loadUsage(got.supabase),
  ]);
  if (!bundle) notFound();
  const knowledge = await buildKnowledgeContext(bundle.attributes);

  return (
    <ContentWorkspace
      initial={content}
      bundle={bundle}
      usage={usage}
      bannedPhrases={profile?.banned_phrases ?? []}
      businessName={profile?.business_name ?? ""}
      knowledgePreview={knowledge.preview}
      aiLocked={got.user.access.state !== "active"}
    />
  );
}
