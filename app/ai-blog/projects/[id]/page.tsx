import { notFound, redirect } from "next/navigation";
import ProjectWorkspace, { type ContentSummary } from "@/components/ai-blog/ProjectWorkspace";
import { attributeLabels, getKnowledgeOptions } from "@/lib/ai-blog/knowledge-context";
import { getAiBlogUser, isUuid, loadProfile, loadProjectBundle } from "@/lib/ai-blog/server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const got = await getAiBlogUser();
  if (!got) redirect(`/login?next=/ai-blog/projects/${id}`);
  if (!got.user.companyId) redirect("/ai-blog/profile?welcome=1");

  const bundle = await loadProjectBundle(got.supabase, id);
  if (!bundle) notFound();

  const [options, profile, { data: contents }] = await Promise.all([
    getKnowledgeOptions(),
    loadProfile(got.supabase, got.user.companyId),
    got.supabase
      .schema("cleanidex")
      .from("contents")
      .select("id, title, keyword, status, mode, generation_count, created_at, updated_at")
      .eq("project_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const labels = attributeLabels(bundle.attributes, options);
  const labelSuggestions = [
    ...labels.spaces.flatMap((s) => labels.contaminants.slice(0, 3).map((c) => `${s} ${c}`)),
    ...labels.contaminants,
  ].slice(0, 30);

  return (
    <ProjectWorkspace
      bundle={bundle}
      serviceOptions={profile?.main_services ?? []}
      contents={(contents ?? []) as ContentSummary[]}
      labelSuggestions={labelSuggestions}
      initialTab={tab === "photos" || tab === "blog" ? tab : "info"}
      canCreate={got.user.access.state === "active"}
    />
  );
}
