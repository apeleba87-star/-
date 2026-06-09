import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createServerSupabase } from "@/lib/supabase-server";

function isInvalidSessionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("Refresh Token") || msg.includes("refresh_token") || msg.includes("Invalid Refresh Token");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && isInvalidSessionError(error)) {
      redirect("/login?next=/admin&reason=session_expired");
    }
    if (!user) {
      redirect("/login?next=/admin");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[admin layout] profile fetch error:", profileError.message);
      redirect("/login?next=/admin&reason=profile_error");
    }
    const isAdmin = profile?.role === "admin" || profile?.role === "editor";
    if (!isAdmin) {
      redirect("/?admin_required=1");
    }

    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-0 px-4 py-6 lg:flex-row lg:gap-8 lg:py-8">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    );
  } catch (e) {
    if (isInvalidSessionError(e)) {
      redirect("/login?next=/admin&reason=session_expired");
    }
    throw e;
  }
}
