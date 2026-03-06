import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import JobPostCard from "@/components/jobs/JobPostCard";

export const revalidate = 60;

export default async function JobsListPage() {
  const supabase = createClient();

  const { data: jobPosts } = await supabase
    .from("job_posts")
    .select("id, title, status, region, district, work_date, created_at")
    .order("created_at", { ascending: false });

  if (!jobPosts?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">인력 구인</h1>
        <p className="text-slate-600">등록된 구인글이 없습니다.</p>
        <Link href="/jobs/new" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          글쓰기
        </Link>
      </div>
    );
  }

  const postIds = jobPosts.map((p) => p.id);
  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, category_main_id, category_sub_id, custom_subcategory_text, required_count, filled_count, pay_amount, pay_unit, status")
    .in("job_post_id", postIds)
    .order("sort_order", { ascending: true });

  const { data: categories } = await supabase.from("categories").select("id, name, parent_id");

  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryMap.set(c.id, c.name);
  }

  const positionsByPost = new Map<string, typeof positions>();
  for (const p of positions ?? []) {
    const list = positionsByPost.get(p.job_post_id) ?? [];
    list.push(p);
    positionsByPost.set(p.job_post_id, list);
  }

  function categoryDisplay(pos: (typeof positions)[0]): string {
    const sub = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
    const main = categoryMap.get(pos.category_main_id);
    if (sub) return sub;
    if (pos.custom_subcategory_text?.trim()) return pos.custom_subcategory_text.trim();
    return main ?? "—";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">인력 구인</h1>
        <Link href="/jobs/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          글쓰기
        </Link>
      </div>
      <ul className="space-y-4">
        {jobPosts.map((post) => {
          const posList = positionsByPost.get(post.id) ?? [];
          return (
            <li key={post.id}>
              <JobPostCard
                id={post.id}
                title={post.title}
                status={post.status}
                region={post.region}
                district={post.district}
                work_date={post.work_date}
                positions={posList.map((p) => ({
                  id: p.id,
                  categoryDisplay: categoryDisplay(p),
                  required_count: p.required_count,
                  filled_count: p.filled_count,
                  pay_amount: Number(p.pay_amount),
                  pay_unit: p.pay_unit,
                  status: p.status as "open" | "partial" | "closed",
                }))}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
