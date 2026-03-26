import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "알림",
  description: "입찰·구인·구독 알림을 확인합니다.",
};

export default async function NotificationsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/notifications");
  }

  const { data: items } = await supabase
    .from("user_notifications")
    .select("id, kind, title, body, link_path, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <NotificationsClient initialItems={items ?? []} />;
}
