#!/usr/bin/env node
/** V2 입주수요 점수 sanity check */

function norm100(value, baseline) {
  if (!value || !baseline) return 100;
  return Math.round((value / baseline) * 1000) / 10;
}

function nationalComposite(pVol, mVol, pIdx, mIdx, baselines) {
  const w = 0.25;
  return (
    norm100(pVol, baselines.p) * w +
    norm100(mVol, baselines.m) * w +
    norm100(pIdx, baselines.pi) * w +
    norm100(mIdx, baselines.mi) * w
  );
}

function regionalComposite(level, mom) {
  return level * 0.7 + mom * 0.3;
}

function score(nat, reg) {
  return Math.round((nat * reg) / 100 * 10) / 10;
}

// 강동: 높은 RTMS 규모, 낮은 MoM
const nat = nationalComposite(120, 110, 105, 100, { p: 100, m: 100, pi: 100, mi: 100 });
const gangdong = score(nat, regionalComposite(norm100(1419, 1100), 127));
const guro = score(nat, regionalComposite(norm100(1089, 1100), 154));

console.log("전국 composite:", nat);
console.log("강동 (규모↑ MoM↓):", gangdong);
console.log("구로 (규모↓ MoM↑):", guro);

if (gangdong <= guro) {
  console.error("FAIL: 규모 우선 — 강동 > 구로 기대");
  process.exit(1);
}
console.log("OK");
