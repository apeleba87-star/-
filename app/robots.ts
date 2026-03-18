import { getBaseUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/login", "/signup", "/mypage/", "/jobs/manage", "/onboarding"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
