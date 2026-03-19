import { createClient } from "@/lib/supabase-server";
import { getBaseUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

const STATIC_PATHS: { path: string; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/news", priority: 0.9, changeFrequency: "daily" },
  { path: "/categories", priority: 0.8, changeFrequency: "weekly" },
  { path: "/listings", priority: 0.8, changeFrequency: "daily" },
  { path: "/tenders", priority: 0.8, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.8, changeFrequency: "daily" },
  { path: "/estimate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contracts", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date().toISOString();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority = 0.5, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const supabase = createClient();

  const { data: categories } = await supabase
    .from("content_categories")
    .select("slug, created_at")
    .order("sort_order", { ascending: true });
  if (categories?.length) {
    for (const cat of categories) {
      entries.push({
        url: `${base}/categories/${cat.slug}`,
        lastModified: cat.created_at ? new Date(cat.created_at).toISOString() : now,
        changeFrequency: "daily" as const,
        priority: 0.7,
      });
    }
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, updated_at")
    .not("published_at", "is", null)
    .eq("is_private", false)
    .order("published_at", { ascending: false })
    .limit(2000);
  if (posts?.length) {
    for (const post of posts) {
      entries.push({
        url: `${base}/posts/${post.id}`,
        lastModified: post.updated_at ? new Date(post.updated_at).toISOString() : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  }

  return entries;
}
