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
import {
  listPublishedEquipment,
  listPublishedEquipmentModels,
} from "@/lib/knowledge-hub/equipment/catalog";
import { listPublishedGuidePaths } from "@/lib/knowledge-hub/queries";
import {
  getSolutionPath,
  listMergedSolutionPages,
  listSolutionPages,
} from "@/lib/knowledge-hub/solutions/get-solutions";
import {
  getPlaceJobPath,
  listMergedPlaceJobs,
} from "@/lib/knowledge-hub/place-jobs";
import {
  EDU_BLOG_SOURCE_TYPE,
  eduBlogCategoryPath,
  eduBlogPath,
} from "@/lib/edu-blog/constants";
import { listPublishedEduBlogCategories } from "@/lib/edu-blog/categories";
import { listPublishedEduBlogPosts } from "@/lib/edu-blog/queries";
import {
  PRACTICE_BLOG_SOURCE_TYPE,
  practiceBlogPath,
  practiceCategoryPath,
} from "@/lib/practice-blog/constants";
import {
  listPublishedPracticeCategories,
  listPublishedPracticePosts,
} from "@/lib/practice-blog/queries";
import type { MetadataRoute } from "next";

const STATIC_PATHS: { path: string; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/services", priority: 0.95, changeFrequency: "weekly" },
  { path: "/places", priority: 0.95, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.95, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/practice", priority: 0.88, changeFrequency: "weekly" },
  { path: "/products", priority: 0.92, changeFrequency: "weekly" },
  { path: "/equipment", priority: 0.9, changeFrequency: "weekly" },
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
  { path: "/beta", priority: 0.7, changeFrequency: "weekly" },
  { path: "/estimate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contracts", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
];

export const revalidate = 3600;

type SitemapRow = MetadataRoute.Sitemap[number];

function pushUnique(
  byUrl: Map<string, SitemapRow>,
  url: string,
  rest: Omit<SitemapRow, "url">
) {
  if (byUrl.has(url)) return;
  byUrl.set(url, { url, ...rest });
}

async function safeList<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[sitemap] ${label}`, err);
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date().toISOString();
  const byUrl = new Map<string, SitemapRow>();

  for (const { path, priority = 0.5, changeFrequency } of STATIC_PATHS) {
    pushUnique(byUrl, `${base}${path}`, { lastModified: now, changeFrequency, priority });
  }

  for (const cat of HUB_CATEGORIES) {
    pushUnique(byUrl, `${base}${cat.hubPath}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  for (const path of ALL_CATALOG_PATHS) {
    const topic = CATALOG_TOPICS.find((t) => t.path === path);
    pushUnique(byUrl, `${base}${path}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: topic?.guideType === "service_method" || topic?.guideType === "problem" ? 0.85 : 0.8,
    });
  }

  for (const r of listRecipes()) {
    pushUnique(byUrl, `${base}/cleaning/${r.slug}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82,
    });
  }

  const products = await safeList("products", () => listMergedProducts(), []);
  for (const p of products) {
    if (p.status === "draft") continue;
    pushUnique(byUrl, `${base}/products/${p.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  const equipment = await safeList("equipment", () => listPublishedEquipment(), []);
  for (const e of equipment) {
    pushUnique(byUrl, `${base}/equipment/${e.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    });
  }

  const equipmentModels = await safeList("equipment-models", () => listPublishedEquipmentModels(), []);
  for (const m of equipmentModels) {
    pushUnique(byUrl, `${base}/equipment/${m.equipmentId}/models/${m.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    });
  }

  for (const c of listCases()) {
    pushUnique(byUrl, `${base}/cases/${c.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const m of listMaterials()) {
    pushUnique(byUrl, `${base}/materials/${m.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const c of listContaminants()) {
    pushUnique(byUrl, `${base}/pollution/${c.id}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  const solutionPages = await safeList("solutions", () => listMergedSolutionPages(), listSolutionPages());
  for (const s of solutionPages) {
    pushUnique(byUrl, `${base}${getSolutionPath(s)}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.86,
    });
  }

  const placeJobs = await safeList("place-jobs", () => listMergedPlaceJobs(), []);
  for (const j of placeJobs) {
    pushUnique(byUrl, `${base}${getPlaceJobPath(j)}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.86,
    });
  }

  const guidePaths = await safeList("guides", () => listPublishedGuidePaths(), []);
  for (const g of guidePaths) {
    pushUnique(byUrl, `${base}${g.path}`, {
      lastModified: g.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  const supabase = createClient();

  try {
    const { data: categories } = await supabase
      .from("content_categories")
      .select("slug, created_at")
      .order("sort_order", { ascending: true });
    if (categories?.length) {
      for (const cat of categories) {
        pushUnique(byUrl, `${base}/categories/${cat.slug}`, {
          lastModified: cat.created_at ? new Date(cat.created_at).toISOString() : now,
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] content-categories", err);
  }

  try {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, updated_at, source_type")
      .not("published_at", "is", null)
      .eq("is_private", false)
      .order("published_at", { ascending: false })
      .limit(2000);
    if (posts?.length) {
      for (const post of posts) {
        if (post.source_type === EDU_BLOG_SOURCE_TYPE) continue;
        if (post.source_type === PRACTICE_BLOG_SOURCE_TYPE) continue;
        pushUnique(byUrl, `${base}/posts/${post.id}`, {
          lastModified: post.updated_at ? new Date(post.updated_at).toISOString() : now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] posts", err);
  }

  const eduCategories = await safeList("edu-blog-categories", () => listPublishedEduBlogCategories(), []);
  for (const cat of eduCategories) {
    pushUnique(byUrl, `${base}${eduBlogCategoryPath(cat.slug)}`, {
      lastModified: cat.updated_at,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  const eduPosts = await safeList("edu-blog", () => listPublishedEduBlogPosts(), []);
  for (const post of eduPosts) {
    pushUnique(byUrl, `${base}${eduBlogPath(post.slug)}`, {
      lastModified: post.updated_at,
      changeFrequency: "weekly",
      priority: 0.78,
    });
  }

  const practiceCategories = await safeList(
    "practice-categories",
    () => listPublishedPracticeCategories(),
    []
  );
  for (const cat of practiceCategories) {
    pushUnique(byUrl, `${base}${practiceCategoryPath(cat.slug)}`, {
      lastModified: cat.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  const practicePosts = await safeList("practice-posts", () => listPublishedPracticePosts(), []);
  for (const post of practicePosts) {
    pushUnique(byUrl, `${base}${practiceBlogPath(post.slug)}`, {
      lastModified: post.updated_at,
      changeFrequency: "weekly",
      priority: 0.78,
    });
  }

  return [...byUrl.values()];
}
