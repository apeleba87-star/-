/**
 * 네이버 데이터랩 통합 검색어 트렌드 API
 * @see https://developers.naver.com/docs/serviceapi/datalab/search/search.md
 */

export type DatalabKeywordGroup = {
  groupName: string;
  keywords: string[];
};

export type DatalabSearchResponse = {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: {
    title: string;
    keywords: string[];
    data: { period: string; ratio: number }[];
  }[];
};

export async function fetchNaverDatalabSearchTrend(input: {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  keywordGroups: DatalabKeywordGroup[];
  clientId: string;
  clientSecret: string;
}): Promise<DatalabSearchResponse> {
  const { startDate, endDate, timeUnit, keywordGroups, clientId, clientSecret } = input;
  if (keywordGroups.length < 1 || keywordGroups.length > 5) {
    throw new Error("keywordGroups must have 1..5 items per request");
  }

  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      timeUnit,
      keywordGroups: keywordGroups.map((g) => ({
        groupName: g.groupName,
        keywords: g.keywords.map((k) => k.trim()).filter(Boolean),
      })),
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Naver DataLab HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return JSON.parse(text) as DatalabSearchResponse;
}
