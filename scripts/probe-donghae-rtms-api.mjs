#!/usr/bin/env node
/** 동해시 LAWD 42170 — 국토부 RTMS API 실거래 건수 확인 */

import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const tradeKey = env.MOLIT_RTMS_TRADE_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;
const rentKey = env.MOLIT_RTMS_RENT_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;

if (!tradeKey || !rentKey) {
  console.error("MOLIT RTMS keys missing in .env.local");
  process.exit(1);
}

const ENDPOINTS = {
  trade: [
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTradeDev",
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
  ],
  rent: [
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRentDev",
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  ],
};

async function countRows(candidates, key, lawdCd, dealYmd) {
  for (const endpoint of candidates) {
    const params = new URLSearchParams({
      serviceKey: key,
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      pageNo: "1",
      numOfRows: "1000",
    });
    const res = await fetch(`${endpoint}?${params}`);
    const text = await res.text();
    if (!text.trim().startsWith("<")) {
      continue;
    }
    const total = Number(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? 0);
    const code = text.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1];
    return { ok: true, endpoint: endpoint.split("/").pop(), totalCount: total, resultCode: code };
  }
  return { ok: false, error: "all endpoints failed" };
}

const dealYmds = ["202505", "202404", "202305"];
for (const dealYmd of dealYmds) {
  console.log("\n---", dealYmd, "---");
  for (const [label, lawd] of [
    ["동해시", "42170"],
    ["동해(51170)", "51170"],
    ["춘천시", "42110"],
    ["춘천(51110)", "51110"],
    ["부평구", "28237"],
    ["김해시", "48250"],
    ["강남구", "11680"],
  ]) {
    const sale = await countRows(ENDPOINTS.trade, tradeKey, lawd, dealYmd);
    const rent = await countRows(ENDPOINTS.rent, rentKey, lawd, dealYmd);
    console.log(label, { sale: sale.totalCount, rent: rent.totalCount });
  }
}
