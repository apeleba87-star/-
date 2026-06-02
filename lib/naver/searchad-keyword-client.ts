import { createHmac } from "node:crypto";

/**
 * 네이버 검색광고 API — 키워드 도구 (/keywordstool)
 * @see https://github.com/naver/searchad-apidoc
 *
 * 콘솔 [도구] → [API 사용 관리] 의 액세스 라이선스·비밀키·고객 ID 사용.
 * monthlyPcQcCnt + monthlyMobileQcCnt = 어제 기준 최근 30일 롤링 통합검색 추정(지역 키워드 포함).
 * API는 12개월 히스토리를 한 번에 주지 않음 — 매월 수집·DB 누적로 1년 차트 구성.
 */

const SEARCHAD_BASE = "https://api.searchad.naver.com";
const KEYWORDSTOOL_URI = "/keywordstool";
/** API 1회 hintKeywords 최대 개수 */
const HINT_BATCH_SIZE = 5;

export type SearchAdKeywordVolume = {
  keyword: string;
  pc: number | null;
  mobile: number | null;
  total: number | null;
  belowTen: boolean;
};

export type SearchAdCredentialsStatus = {
  configured: boolean;
  customerId: string | null;
};

type KeywordListItem = {
  relKeyword?: string;
  monthlyPcQcCnt?: number | string;
  monthlyMobileQcCnt?: number | string;
};

export class SearchAdApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "SearchAdApiError";
  }
}

/** API·매칭용 — 공백 제거 (검색광고 hintKeywords는 띄어쓰기 불가) */
function normalizeKeywordKey(keyword: string): string {
  return keyword.trim().replace(/\s+/g, "");
}

/**
 * keywordstool hintKeywords 값. 공백·탭이 있으면 11001 INVALID_PARAMETER.
 * @see https://github.com/naver/searchad-apidoc/issues/1043
 */
export function toSearchAdHintKeyword(phrase: string): string {
  const compact = normalizeKeywordKey(phrase);
  if (!compact) {
    throw new SearchAdApiError(`hintKeywords가 비었습니다: "${phrase}"`);
  }
  if (compact.length > 100) {
    throw new SearchAdApiError(`hintKeywords가 너무 깁니다 (${compact.length}자)`);
  }
  return compact;
}

function parseQcCount(raw: number | string | undefined): { value: number | null; belowTen: boolean } {
  if (raw == null) return { value: null, belowTen: false };
  if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw, belowTen: false };
  const s = String(raw).trim();
  if (s === "< 10" || s === "<10") return { value: null, belowTen: true };
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n, belowTen: false } : { value: null, belowTen: false };
}

function rowToVolume(keyword: string, row: KeywordListItem): SearchAdKeywordVolume {
  const pc = parseQcCount(row.monthlyPcQcCnt);
  const mobile = parseQcCount(row.monthlyMobileQcCnt);
  const belowTen = pc.belowTen || mobile.belowTen;
  const total =
    pc.value != null && mobile.value != null
      ? pc.value + mobile.value
      : pc.value ?? mobile.value ?? null;

  return {
    keyword,
    pc: pc.value,
    mobile: mobile.value,
    total,
    belowTen,
  };
}

function signRequest(timestamp: string, method: string, uri: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${method}.${uri}`).digest("base64");
}

export function getSearchAdCredentials(): {
  apiKey: string;
  secret: string;
  customerId: string;
} | null {
  const apiKey =
    process.env.NAVER_SEARCHAD_API_KEY?.trim() ||
    process.env.NAVER_SEARCHAD_ACCESS_LICENSE?.trim();
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY?.trim();
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID?.trim();
  if (!apiKey || !secret || !customerId) return null;
  return { apiKey, secret, customerId };
}

export function getSearchAdCredentialsStatus(): SearchAdCredentialsStatus {
  const creds = getSearchAdCredentials();
  return {
    configured: creds != null,
    customerId: creds?.customerId ?? null,
  };
}

async function keywordstoolRequest(apiHints: string[]): Promise<KeywordListItem[]> {
  const creds = getSearchAdCredentials();
  if (!creds) {
    throw new SearchAdApiError("Search Ad credentials missing");
  }

  const hints = apiHints.map((k) => k.trim()).filter(Boolean);
  if (hints.length === 0) return [];

  for (const h of hints) {
    if (/\s/.test(h)) {
      throw new SearchAdApiError(
        `hintKeywords에 공백이 포함되어 있습니다: "${h}" (API는 띄어쓰기 불가)`
      );
    }
  }

  const method = "GET";
  const timestamp = String(Date.now());
  const signature = signRequest(timestamp, method, KEYWORDSTOOL_URI, creds.secret);

  const params = new URLSearchParams({
    hintKeywords: hints.join(","),
    showDetail: "1",
  });

  const res = await fetch(`${SEARCHAD_BASE}${KEYWORDSTOOL_URI}?${params}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": timestamp,
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": signature,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new SearchAdApiError(`Naver Search Ad HTTP ${res.status}: ${text.slice(0, 400)}`, res.status, text);
  }

  const json = JSON.parse(text) as { keywordList?: KeywordListItem[] };
  return json.keywordList ?? [];
}

function matchVolumeForHint(
  displayPhrase: string,
  apiHint: string,
  list: KeywordListItem[]
): SearchAdKeywordVolume | null {
  const hintKey = normalizeKeywordKey(apiHint);
  const row =
    list.find((k) => normalizeKeywordKey(k.relKeyword ?? "") === hintKey) ??
    list.find((k) => normalizeKeywordKey(k.relKeyword ?? "").includes(hintKey)) ??
    list[0];
  if (!row) return null;
  return rowToVolume(displayPhrase, row);
}

/** hintKeywords 1개 */
export async function fetchSearchAdKeywordVolume(keyword: string): Promise<SearchAdKeywordVolume | null> {
  const map = await fetchSearchAdKeywordVolumes([keyword]);
  return map.get(keyword.trim()) ?? null;
}

/** 최대 5개/요청(공백 제거된 hint). 실패 시 해당 청크만 1건씩 재시도 */
export async function fetchSearchAdKeywordVolumes(
  keywords: string[]
): Promise<Map<string, SearchAdKeywordVolume>> {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  const result = new Map<string, SearchAdKeywordVolume>();

  const entries = unique.map((phrase) => ({
    phrase,
    apiHint: toSearchAdHintKeyword(phrase),
  }));

  for (let i = 0; i < entries.length; i += HINT_BATCH_SIZE) {
    const chunk = entries.slice(i, i + HINT_BATCH_SIZE);
    const apiHints = chunk.map((e) => e.apiHint);

    let list: KeywordListItem[];
    try {
      list = await keywordstoolRequest(apiHints);
    } catch (e) {
      const isHintError =
        e instanceof SearchAdApiError &&
        (e.body?.includes("11001") || e.body?.includes("hintKeywords"));
      if (!isHintError || chunk.length === 1) throw e;
      list = [];
      for (const { phrase, apiHint } of chunk) {
        const single = await keywordstoolRequest([apiHint]);
        const vol = matchVolumeForHint(phrase, apiHint, single);
        if (vol) result.set(phrase, vol);
        await sleep(120);
      }
      continue;
    }

    for (const { phrase, apiHint } of chunk) {
      const vol = matchVolumeForHint(phrase, apiHint, list);
      if (vol) result.set(phrase, vol);
    }
    if (i + HINT_BATCH_SIZE < entries.length) {
      await sleep(150);
    }
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 관리자 연결 테스트 — 전국 「입주청소」 1건 */
export async function testSearchAdConnection(): Promise<{
  ok: true;
  sample: SearchAdKeywordVolume;
} | { ok: false; error: string; status?: number }> {
  try {
    const vol = await fetchSearchAdKeywordVolume("입주청소");
    if (!vol) {
      return { ok: false, error: "keywordList가 비어 있습니다. 키워드·권한을 확인하세요." };
    }
    return { ok: true, sample: vol };
  } catch (e) {
    if (e instanceof SearchAdApiError) {
      return { ok: false, error: e.message, status: e.status };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
