/** URL query params for /jobs/manage?view=applicants (전체 지원자). */

export type ApplicantsPeriod = "upcoming" | "past" | "all";
export type ApplicantsSort = "applied_desc" | "work_desc" | "work_asc";
export type ApplicantsStatusFilter = "all" | "pending" | "accepted" | "no_show_reported";

export const MANAGE_APPLICANTS_PAGE_SIZE = 10;
export const MANAGE_APPLICANTS_FETCH_CAP = 4000;
/** 과거 현장 + 작업일 정렬 시 DB에서 가져오는 상한 (메모리 정렬 부담 완화) */
export const MANAGE_APPLICANTS_FETCH_CAP_PAST = 1200;

export type ManageApplicantsParsedParams = {
  q: string;
  status: ApplicantsStatusFilter;
  postId: string | "all";
  period: ApplicantsPeriod;
  sort: ApplicantsSort;
  page: number;
  workFrom: string;
  workTo: string;
};

const DEFAULTS: ManageApplicantsParsedParams = {
  q: "",
  status: "all",
  postId: "all",
  period: "upcoming",
  sort: "applied_desc",
  page: 1,
  workFrom: "",
  workTo: "",
};

function parseString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseManageApplicantsParams(
  raw: Record<string, string | string[] | undefined>
): ManageApplicantsParsedParams {
  const q = parseString(raw.ap_q);
  const workFrom = parseString(raw.ap_wf);
  const workTo = parseString(raw.ap_wt);
  const postRaw = parseString(raw.ap_post);
  const postId = postRaw === "" || postRaw === "all" ? "all" : postRaw;

  let status: ApplicantsStatusFilter = "all";
  const st = parseString(raw.ap_status);
  if (st === "pending" || st === "accepted" || st === "no_show_reported") status = st;

  let period: ApplicantsPeriod = DEFAULTS.period;
  const per = parseString(raw.ap_period);
  if (per === "past" || per === "all" || per === "upcoming") period = per;

  let sort: ApplicantsSort = DEFAULTS.sort;
  const so = parseString(raw.ap_sort);
  if (so === "work_desc" || so === "work_asc") sort = so;

  let page = DEFAULTS.page;
  const p = parseString(raw.ap_page);
  if (p) {
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 1) page = n;
  }

  return { q, status, postId, period, sort, page, workFrom, workTo };
}

export function buildManageApplicantsQuery(
  base: ManageApplicantsParsedParams,
  patch: Partial<ManageApplicantsParsedParams>
): string {
  const next = { ...base, ...patch };
  if (patch.page === undefined && Object.keys(patch).some((k) => k !== "page")) {
    next.page = 1;
  }
  const q = new URLSearchParams();
  q.set("view", "applicants");
  if (next.q) q.set("ap_q", next.q);
  if (next.status !== "all") q.set("ap_status", next.status);
  if (next.postId !== "all") q.set("ap_post", next.postId);
  if (next.period !== DEFAULTS.period) q.set("ap_period", next.period);
  if (next.sort !== DEFAULTS.sort) q.set("ap_sort", next.sort);
  if (next.page > 1) q.set("ap_page", String(next.page));
  if (next.workFrom) q.set("ap_wf", next.workFrom);
  if (next.workTo) q.set("ap_wt", next.workTo);
  const s = q.toString();
  return s ? `?${s}` : "?view=applicants";
}
