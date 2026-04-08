/** Scsbid 원천/요약 공통: source_record_id 및 필드 추출 */

export function scsbidGetFromRow(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

export function scsbidAwardSourceRecordId(row: Record<string, unknown>): string | null {
  const bidNo = String(scsbidGetFromRow(row, ["bidNtceNo", "bid_ntce_no"]) ?? "").trim();
  if (!bidNo) return null;
  const ordRaw = String(scsbidGetFromRow(row, ["bidNtceOrd", "bid_ntce_ord"]) ?? "00").replace(/\D/g, "") || "0";
  const ord = ordRaw.padStart(3, "0").slice(-3);
  const clsfc = String(scsbidGetFromRow(row, ["bidClsfcNo", "bid_clsfc_no"]) ?? "").trim() || "-";
  const rbid = String(scsbidGetFromRow(row, ["rbidNo", "rbid_no"]) ?? "0").replace(/\D/g, "") || "0";
  return `${bidNo}|${ord}|${clsfc}|${rbid}`;
}
