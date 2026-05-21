export function buildNewsReportListHref(category: string, page = 1): string {
  const q = new URLSearchParams();
  if (category === "private" || ["chemical", "equipment", "labor", "industry"].includes(category)) {
    q.set("section", "industry");
    q.set("category", category);
  } else {
    q.set("section", "report");
    q.set("category", category);
  }
  if (page > 1) q.set("page", String(page));
  return `/news?${q.toString()}`;
}

export function buildJobMarketReportListHref(page = 1): string {
  return page > 1 ? `/job-market-report?page=${page}` : "/job-market-report";
}

export function buildMarketingReportListHref(page = 1): string {
  return page > 1 ? `/marketing-report?page=${page}` : "/marketing-report";
}
