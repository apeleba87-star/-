/**
 * 나라장터(공공데이터포털) 용역 목록 API 단발 호출 테스트.
 * lib/g2b/client.ts 와 동일하게 serviceKey는 쿼리에 직접 붙이고 나머지만 URLSearchParams로 만든다.
 *
 * 사용:
 *   npm run g2b:ping
 *   PowerShell에서 npm 이 막히면: node scripts/g2b-ping.mjs
 *   또는 프로젝트 루트에서: scripts\g2b-ping.cmd
 * 키: .env.local 또는 .env 의 DATA_GO_KR_SERVICE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadServiceKey() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^DATA_GO_KR_SERVICE_KEY\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v) return v;
    }
  }
  return "";
}

const pad = (n) => String(n).padStart(2, "0");
const toYmdHm = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;

const key = loadServiceKey();
if (!key) {
  console.error("DATA_GO_KR_SERVICE_KEY 가 .env.local 또는 .env 에 없습니다.");
  process.exit(1);
}

const end = new Date();
const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
const inqryBgnDt = toYmdHm(start);
const inqryEndDt = toYmdHm(end);

const rest = new URLSearchParams({
  returnType: "json",
  pageNo: "1",
  numOfRows: "5",
  inqryBgnDt,
  inqryEndDt,
  inqryDiv: "1",
}).toString();

const url = `https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc?serviceKey=${key}&${rest}`;

const TIMEOUT_MS = Number(process.env.G2B_PING_TIMEOUT_MS ?? 60_000) || 60_000;
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), TIMEOUT_MS);

console.log("나라장터 API ping (getBidPblancListInfoServc)");
console.log("구간:", inqryBgnDt, "~", inqryEndDt);
console.log("타임아웃:", TIMEOUT_MS / 1000, "초 (환경변수 G2B_PING_TIMEOUT_MS 로 변경 가능)\n");

const t0 = performance.now();
try {
  const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
  const text = await res.text();
  const ms = Math.round(performance.now() - t0);
  clearTimeout(t);

  console.log("HTTP", res.status, "| 소요", ms, "ms");
  console.log("Content-Type:", res.headers.get("content-type") ?? "(없음)");
  const preview = text.length > 600 ? `${text.slice(0, 600)}…` : text;
  console.log("\n본문 앞부분:\n", preview);

  if (!res.ok) process.exit(1);
} catch (e) {
  clearTimeout(t);
  const ms = Math.round(performance.now() - t0);
  console.error("실패 (" + ms + " ms):", e instanceof Error ? e.message : e);
  process.exit(1);
}
