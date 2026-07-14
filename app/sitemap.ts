import { createClient } from "@/lib/supabase-server";
import { getBaseUrl } from "@/lib/seo";
import { ALL_CATALOG_PATHS, CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import {
  listCases,
  listContaminants,
  listMaterials,
  listRecipes,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { listPublishedGuidePaths } from "@/lib/knowledge-hub/queries";
import {
  getSolutionPath,
  listSolutionPages,
} from "@/lib/knowledge-hub/solutions/get-solutions";
import type { MetadataRoute } from "next";

const STATIC_PATHS: { path: string; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/services", priority: 0.95, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.95, changeFrequency: "weekly" },
  { path: "/products", priority: 0.92, changeFrequency: "weekly" },
  { path: "/materials", priority: 0.92, changeFrequency: "weekly" },
  { path: "/pollution", priority: 0.92, changeFrequency: "weekly" },
  { path: "/solutions", priority: 0.93, changeFrequency: "weekly" },
  { path: "/cases", priority: 0.85, changeFrequency: "weekly" },
  { path: "/cleaning", priority: 0.9, changeFrequency: "weekly" },
  { path: "/inquiry/regular", priority: 0.85, changeFrequency: "monthly" },
  { path: "/inquiry/move-in", priority: 0.85, changeFrequency: "monthly" },
  { path: "/categories", priority: 0.8, changeFrequency: "weekly" },
  { path: "/listings", priority: 0.8, changeFrequency: "daily" },
  { path: "/tenders", priority: 0.8, changeFrequency: "daily" },
  { path: "/tender-awards", priority: 0.75, changeFrequency: "daily" },
  { path: "/marketing-report", priority: 0.75, changeFrequency: "daily" },
  { path: "/job-market-report", priority: 0.75, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.8, changeFrequency: "daily" },
  { path: "/jobs/public", priority: 0.82, changeFrequency: "daily" },
  { path: "/magam/live", priority: 0.8, changeFrequency: "daily" },
  { path: "/magam/support", priority: 0.4, changeFrequency: "monthly" },
  { path: "/beta", priority: 0.7, changeFrequency: "weekly" },
  { path: "/estimate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contracts", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
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

  for (const cat of HUB_CATEGORIES) {
    entries.push({
      url: `${base}${cat.hubPath}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    });
  }

  for (const path of ALL_CATALOG_PATHS) {
    const topic = CATALOG_TOPICS.find((t) => t.path === path);
    entries.push({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: topic?.guideType === "service_method" || topic?.guideType === "problem" ? 0.85 : 0.8,
    });
  }

  for (const r of listRecipes()) {
    entries.push({
      url: `${base}/cleaning/${r.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.82,
    });
  }

  for (const p of await listMergedProducts()) {
    if (p.status === "draft") continue;
    entries.push({
      url: `${base}/products/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  }

  for (const c of listCases()) {
    entries.push({
      url: `${base}/cases/${c.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    });
  }

  for (const m of listMaterials()) {
    entries.push({
      url: `${base}/materials/${m.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  }

  for (const c of listContaminants()) {
    entries.push({
      url: `${base}/pollution/${c.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  }

  for (const s of listSolutionPages()) {
    entries.push({
      url: `${base}${getSolutionPath(s)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.86,
    });
  }

  const guidePaths = await listPublishedGuidePaths();
  for (const g of guidePaths) {
    if (entries.some((e) => e.url === `${base}${g.path}`)) continue;
    entries.push({
      url: `${base}${g.path}`,
      lastModified: g.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  }

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
