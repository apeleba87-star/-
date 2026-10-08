import Link from "next/link";
import { redirect } from "next/navigation";
import ProjectForm from "@/components/ai-blog/ProjectForm";
import { getAiBlogUser, loadProfile } from "@/lib/ai-blog/server";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const got = await getAiBlogUser();
  if (!got) redirect("/login?next=/ai-blog/projects/new");
  if (!got.user.companyId && got.user.access.state === "active") redirect("/ai-blog/profile?welcome=1");
  const profile = got.user.companyId ? await loadProfile(got.supabase, got.user.companyId) : null;

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        <Link href="/ai-blog" className="hover:underline">
          내 현장
        </Link>{" "}
        / 새 현장
      </div>
      <h1 className="text-xl font-bold text-slate-900">새 현장 등록</h1>
      <ProjectForm project={null} attributes={[]} serviceOptions={profile?.main_services ?? []} />
    </div>
  );
}
