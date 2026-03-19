import { notFound, redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import JobPostForm from "@/app/jobs/new/JobPostForm";

export const revalidate = 0;

export default async function JobPostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/jobs/${id}/edit`)}`);

  const supabase = createClient();
  const { data: post, error: postError } = await supabase
    .from("job_posts")
    .select("id, user_id, title, region, district, address, work_date, start_time, end_time, description, contact_phone")
    .eq("id", id)
    .single();

  if (postError || !post) notFound();
  if (post.user_id !== user.id) notFound();

  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("id, job_type_input, normalized_job_type_key, skill_level, pay_amount, pay_unit, required_count, work_scope, notes, work_period, start_time, end_time")
    .eq("job_post_id", id)
    .order("sort_order", { ascending: true });

  const { data: privateDetails } = await supabase
    .from("job_post_private_details")
    .select("full_address, contact_phone, access_instructions, parking_info, notes")
    .eq("job_post_id", id)
    .maybeSingle();

  const { data: company } = await authSupabase
    .from("company_profiles")
    .select("contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, sort_order, is_active")
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .order("sort_order", { ascending: true });

  const list = categories ?? [];
  const mainCategories = list.filter((c) => c.parent_id == null);
  const subCategories = list.filter((c) => c.parent_id != null);

  const initialData = {
    title: post.title,
    regionSido: post.region as "서울" | "부산" | "대구" | "인천" | "광주" | "대전" | "울산" | "세종" | "경기" | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주",
    regionGugun: post.district ?? "",
    workDate: post.work_date ? String(post.work_date).slice(0, 10) : "",
    startTime: post.start_time ? String(post.start_time).slice(0, 5) : "",
    endTime: post.end_time ? String(post.end_time).slice(0, 5) : "",
    description: post.description ?? "",
    contactPhone: post.contact_phone ?? "",
    address: post.address ?? "",
    fullAddress: privateDetails?.full_address ?? "",
    accessInstructions: privateDetails?.access_instructions ?? "",
    parkingInfo: privateDetails?.parking_info ?? "",
    siteNotes: privateDetails?.notes ?? "",
    useSameTimeForPositions: true,
    positions: (positions ?? []).map((p) => ({
      id: p.id,
      job_type_key: p.normalized_job_type_key ?? null,
      job_type_input: p.job_type_input ?? "",
      skill_level: (p.skill_level === "expert" || p.skill_level === "general" ? p.skill_level : "general") as "expert" | "general",
      pay_amount: Number(p.pay_amount),
      pay_unit: p.pay_unit as "day" | "half_day" | "hour",
      required_count: p.required_count,
      work_scope: p.work_scope ?? null,
      notes: p.notes ?? null,
      work_period: (p.work_period as "am" | "pm" | null) ?? null,
      start_time: p.start_time ? String(p.start_time).slice(0, 5) : null,
      end_time: p.end_time ? String(p.end_time).slice(0, 5) : null,
    })),
  };

  return (
    <JobPostForm
      jobPostId={id}
      initialData={initialData}
      mainCategories={mainCategories}
      subCategories={subCategories}
      contactPhoneFromProfile={company?.contact_phone ?? null}
    />
  );
}
