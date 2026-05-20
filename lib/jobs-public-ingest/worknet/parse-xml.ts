import { XMLParser } from "fast-xml-parser";

export function asXmlString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v !== null && "#text" in (v as object)) {
    return asXmlString((v as { "#text"?: unknown })["#text"]);
  }
  return "";
}

export function parseXmlRoot(text: string): Record<string, unknown> | null {
  const trim = text.trim();
  if (!trim.startsWith("<")) return null;
  try {
    const parser = new XMLParser({
      ignoreDeclaration: true,
      removeNSPrefix: true,
      trimValues: true,
      isArray: (name) => name === "wanted",
    });
    const parsed = parser.parse(trim) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

export function xmlRows<T extends Record<string, unknown>>(
  row: unknown,
  map: (obj: Record<string, unknown>) => T
): T[] {
  if (row == null) return [];
  if (Array.isArray(row)) {
    return row
      .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
      .map(map);
  }
  if (typeof row === "object") {
    return [map(row as Record<string, unknown>)];
  }
  return [];
}
