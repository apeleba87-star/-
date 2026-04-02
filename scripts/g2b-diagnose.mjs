/**
 * 동일 G2B URL로 짧은 타임아웃(5초) vs 긴 타임아웃(45초) 비교.
 * node scripts/g2b-diagnose.mjs
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
  console.error("DATA_GO_KR_SERVICE_KEY 없음");
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

async function tryFetch(label, timeoutMs) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    return {
      label,
      completed: true,
      httpOk: res.ok,
      ms,
      status: res.status,
      preview: text.slice(0, 200),
    };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return {
      label,
      completed: false,
      ms,
      err: e instanceof Error ? e.message : String(e),
    };
  }
}

console.log("G2B 진단: getBidPblancListInfoServc (수집과 동일 엔드포인트·파라미터)");
console.log("구간:", inqryBgnDt, "~", inqryEndDt);
console.log("");

const prodLike = await tryFetch("짧은 타임아웃 5000ms (이전 수집 기본과 동일 계열)", 5000);
console.log(JSON.stringify(prodLike, null, 2));

const long = await tryFetch("긴 타임아웃 45000ms (현재 G2B 기본과 동일 계열)", 45000);
console.log(JSON.stringify(long, null, 2));

console.log("\n해석:");
if (!prodLike.completed) {
  console.log("- 짧은 타임아웃에서 Abort → 수집 코드의 safeFetch 제한(이전 5초)과 동일 증상: 응답 전에 끊김.");
}
if (long.completed && !long.httpOk) {
  console.log(
    `- 긴 타임아웃 후 HTTP ${long.status} → 게이트웨이/백엔드 쪽 오류(예: 502). 키 문제가 아니라 상대 인프라·지연 가능성이 큼.`
  );
}
if (long.completed && long.httpOk) {
  console.log("- 긴 타임아웃으로 200 응답 → 지연만 길었던 경우. 타임아웃 상향이 도움됨.");
}
