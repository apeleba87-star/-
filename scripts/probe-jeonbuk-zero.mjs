#!/usr/bin/env node
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const tradeKey = env.MOLIT_RTMS_TRADE_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;
const rentKey = env.MOLIT_RTMS_RENT_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;
const ep = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const rep = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

async function count(endpoint, key, lawd) {
  const params = new URLSearchParams({
    serviceKey: key,
    LAWD_CD: lawd,
    DEAL_YMD: "202505",
    pageNo: "1",
    numOfRows: "1000",
  });
  const res = await fetch(`${endpoint}?${params}`);
  const text = await res.text();
  if (!text.trim().startsWith("<")) return -1;
  return Number(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? 0);
}

const cases = [
  ["금산 52050", "52050"],
  ["금산 52750", "52750"],
  ["옥구 52820", "52820"],
  ["김제 52210", "52210"],
  ["이리 52150", "52150"],
  ["익산 52140", "52140"],
  ["정주 52170", "52170"],
  ["전주 52111", "52111"],
];

for (const [label, lawd] of cases) {
  const s = await count(ep, tradeKey, lawd);
  const r = await count(rep, rentKey, lawd);
  console.log(label, { sale: s, rent: r });
}
