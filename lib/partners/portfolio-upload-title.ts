/** 포트폴리오 업로드 시 표시 제목 (다중 선택 시 번호 규칙 포함) */
export function portfolioItemTitleForUpload(
  fileName: string,
  indexInBatch: number,
  batchSize: number,
  userTitleRaw: string
): string {
  const t = userTitleRaw.trim();
  if (t) {
    return batchSize === 1 ? t : `${t} (${indexInBatch + 1})`;
  }
  const n = fileName.replace(/\.[^.]+$/i, "").trim();
  return n || "작업 사례";
}
