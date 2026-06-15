/** 공고 등록·마감 시각 — 6월 14일 오후 11:40 */
export function formatMagamWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours < 12 ? "오전" : "오후";
  const h12 = hours % 12 || 12;
  const mm = String(minutes).padStart(2, "0");

  return `${month}월 ${day}일 ${period} ${h12}:${mm}`;
}
