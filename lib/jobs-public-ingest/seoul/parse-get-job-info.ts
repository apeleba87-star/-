import { XMLParser } from "fast-xml-parser";

export type SeoulGetJobInfoRow = Record<string, string>;

export type SeoulGetJobInfoParsed = {
  listTotalCount: number;
  resultCode: string;
  resultMessage: string;
  rows: SeoulGetJobInfoRow[];
};

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** XML/JSON 공통: row 객체를 문자열만 남긴 레코드로 정리 */
function normalizeRow(obj: Record<string, unknown>): SeoulGetJobInfoRow {
  const out: SeoulGetJobInfoRow = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = asString((v as { "#text"?: unknown })["#text"] ?? v);
    } else {
      out[k] = asString(v);
    }
  }
  return out;
}

function parseRows(row: unknown): SeoulGetJobInfoRow[] {
  if (row == null) return [];
  if (Array.isArray(row)) {
    return row
      .filter((r): r is Record<string, unknown> => r != null && typeof r === "object" && !Array.isArray(r))
      .map((r) => normalizeRow(r));
  }
  if (typeof row === "object") {
    return [normalizeRow(row as Record<string, unknown>)];
  }
  return [];
}

function parseFromXml(text: string): SeoulGetJobInfoParsed | null {
  const trim = text.trim();
  if (!trim.startsWith("<")) return null;
  try {
    const parser = new XMLParser({
      ignoreDeclaration: true,
      trimValues: true,
      isArray: (name) => name === "row",
    });
    const doc = parser.parse(text) as {
      GetJobInfo?: {
        list_total_count?: number | string;
        RESULT?: { CODE?: string; MESSAGE?: string } | Array<{ CODE?: string; MESSAGE?: string }>;
        row?: unknown;
      };
    };
    const root = doc.GetJobInfo;
    if (!root) return null;
    const totalRaw = root.list_total_count;
    const total = typeof totalRaw === "number" ? totalRaw : Number(String(totalRaw ?? "0").replace(/\D/g, "")) || 0;
    let resultCode = "";
    let resultMessage = "";
    const res = root.RESULT;
    if (Array.isArray(res)) {
      const first = res[0];
      resultCode = asString(first?.CODE);
      resultMessage = asString(first?.MESSAGE);
    } else if (res && typeof res === "object") {
      resultCode = asString(res.CODE);
      resultMessage = asString(res.MESSAGE);
    }
    return {
      listTotalCount: total,
      resultCode,
      resultMessage,
      rows: parseRows(root.row),
    };
  } catch {
    return null;
  }
}

function parseFromJson(text: string): SeoulGetJobInfoParsed | null {
  const trim = text.trim();
  if (!trim || trim.startsWith("<")) return null;
  try {
    const j = JSON.parse(text) as {
      GetJobInfo?: {
        list_total_count?: number | string;
        RESULT?: { CODE?: string; MESSAGE?: string };
        row?: unknown;
      };
    };
    const root = j.GetJobInfo;
    if (!root) return null;
    const totalRaw = root.list_total_count;
    const total = typeof totalRaw === "number" ? totalRaw : Number(String(totalRaw ?? "0").replace(/\D/g, "")) || 0;
    const res = root.RESULT;
    const resultCode = res && typeof res === "object" ? asString(res.CODE) : "";
    const resultMessage = res && typeof res === "object" ? asString(res.MESSAGE) : "";
    return {
      listTotalCount: total,
      resultCode,
      resultMessage,
      rows: parseRows(root.row),
    };
  } catch {
    return null;
  }
}

/**
 * 서울 OpenAPI GetJobInfo 응답 본문(XML 우선 시도 후 JSON).
 */
export function parseSeoulGetJobInfoResponse(text: string): SeoulGetJobInfoParsed {
  const xml = parseFromXml(text);
  if (xml) return xml;
  const json = parseFromJson(text);
  if (json) return json;
  return {
    listTotalCount: 0,
    resultCode: "PARSE_ERR",
    resultMessage: "응답을 XML/JSON으로 파싱할 수 없습니다.",
    rows: [],
  };
}
