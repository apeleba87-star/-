import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO } from "./source-slugs";
import { fetchSeoulGetJobInfoPage, type SeoulResponseFormat } from "./seoul/fetch-get-job-info";
import { upsertJobOpenDataRawBatch } from "./upsert-open-data-raw";

const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_MAX_ROWS_PER_RUN = 2500;
const MAX_PAGES_GUARD = 250;

export async function runSeoulOpenApiGetJobInfoIngest(opts: {
  supabase: SupabaseClient;
  apiKey: string;
  baseUrl?: string;
  responseFormat?: SeoulResponseFormat;
  pageSize?: number;
  maxRowsPerRun?: number;
}): Promise<{
  ok: boolean;
  pages: number;
  rowsWritten: number;
  listTotalCount: number;
  lastResultCode?: string;
  error?: string;
}> {
  const pageSize = Math.min(1000, Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE)));
  const maxRows = Math.max(1, Math.floor(opts.maxRowsPerRun ?? DEFAULT_MAX_ROWS_PER_RUN));
  let start = 1;
  let listTotal = 0;
  let pages = 0;
  let rowsWritten = 0;
  let lastCode = "";

  while (rowsWritten < maxRows && pages < MAX_PAGES_GUARD) {
    const remaining = maxRows - rowsWritten;
    const span = Math.min(pageSize, remaining);
    const end = start + span - 1;
    const parsed = await fetchSeoulGetJobInfoPage({
      apiKey: opts.apiKey,
      startIndex: start,
      endIndex: end,
      format: opts.responseFormat ?? "xml",
      baseUrl: opts.baseUrl,
    });
    pages += 1;
    lastCode = parsed.resultCode;

    if (parsed.resultCode !== "INFO-000" && parsed.resultCode !== "INFO-200") {
      return {
        ok: false,
        pages,
        rowsWritten,
        listTotalCount: parsed.listTotalCount || listTotal,
        lastResultCode: parsed.resultCode,
        error: parsed.resultMessage || `API 결과 코드: ${parsed.resultCode}`,
      };
    }

    if (parsed.listTotalCount > 0) listTotal = parsed.listTotalCount;

    if (parsed.resultCode === "INFO-200" || parsed.rows.length === 0) {
      break;
    }

    const batch = parsed.rows
      .map((r) => {
        const id = (r.JO_REGIST_NO || r.JO_REQST_NO || "").trim();
        if (!id) return null;
        return {
          source_slug: JOB_OPEN_DATA_SOURCE_SEOUL_GET_JOB_INFO,
          source_record_id: id,
          payload: r as unknown as Record<string, unknown>,
          last_fetched_at: new Date().toISOString(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const { error } = await upsertJobOpenDataRawBatch(opts.supabase, batch);
    if (error) {
      return {
        ok: false,
        pages,
        rowsWritten,
        listTotalCount: listTotal,
        lastResultCode: lastCode,
        error,
      };
    }

    rowsWritten += batch.length;
    start = end + 1;

    if (listTotal > 0 && start > listTotal) break;
    if (parsed.rows.length < span) break;
  }

  if (pages >= MAX_PAGES_GUARD) {
    return {
      ok: false,
      pages,
      rowsWritten,
      listTotalCount: listTotal,
      lastResultCode: lastCode,
      error: `페이지 상한(${MAX_PAGES_GUARD})에 도달했습니다. maxRows·pageSize를 조정하세요.`,
    };
  }

  return { ok: true, pages, rowsWritten, listTotalCount: listTotal, lastResultCode: lastCode };
}
