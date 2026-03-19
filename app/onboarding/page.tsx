import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

function isValidNext(next: string | null): next is string {
  if (!next || typeof next !== "string") return false;
  const path = next.startsWith("/") ? next : `/${next}`;
  return path.startsWith("/jobs") || path === "/" || path.startsWith("/mypage") || path.startsWith("/listings");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase.from("profiles").select("onboarding_done").eq("id", user.id).single();
  const params = await searchParams;
  const nextUrl = params?.next ?? null;
  if (profile?.onboarding_done) {
    redirect(isValidNext(nextUrl) ? nextUrl : "/");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">클린아이덱스에서 어떤 활동을 하시나요?</h1>
      <p className="mb-8 text-slate-600">복수 선택 가능합니다.</p>
      <OnboardingForm nextUrl={isValidNext(nextUrl) ? nextUrl : undefined} />
    </div>
  );
}
