/**
 * 재질 매핑 과다·금지 누락 점검
 * npx tsx scripts/audit-material-mapping.ts
 */
import { SOURCE_DOC_KNOWLEDGE, productHardForbidsMaterial } from "../lib/knowledge-hub/cleaning-knowledge/build-from-source";
import { listProductsForMaterial } from "../lib/knowledge-hub/cleaning-knowledge/get-knowledge";

const db = SOURCE_DOC_KNOWLEDGE;

type Hit = {
  productId: string;
  name: string;
  reason: string;
  detail: string;
};

const hits: Hit[] = [];

for (const p of db.products) {
  const mats = p.materialsRaw ?? [];
  const forb = p.forbiddenRaw ?? [];
  const compat = new Set(p.compatibleMaterialIds ?? []);

  for (const id of compat) {
    if (productHardForbidsMaterial(p.forbiddenRaw, id)) {
      hits.push({
        productId: p.id,
        name: p.name,
        reason: `${id}: compatible∩hard-forbidden`,
        detail: (p.forbiddenRaw ?? []).filter((s) => !/코팅|손상|민감|보호필름|새\s|함침|변색|시험|확인|사전|일부/.test(s)).join(" · "),
      });
    }
  }

  // 비구체 허용 매핑 잔존
  if (compat.has("pvc-deco")) {
    const specific = mats.some((s) =>
      /리놀륨|데코타일|PVC\s*계?\s*데코|PVC\s*바닥|비닐\s*바닥|탄성\s*바닥/.test(s)
    );
    if (!specific) {
      hits.push({
        productId: p.id,
        name: p.name,
        reason: "pvc-deco: 비구체 매핑",
        detail: mats.filter((s) => /PVC|합성|비닐|리놀|데코/.test(s)).join(" · "),
      });
    }
  }

  if (compat.has("enamel") && mats.some((s) => /^욕조$/.test(s.trim())) && !mats.some((s) => /에나멜/.test(s))) {
    hits.push({
      productId: p.id,
      name: p.name,
      reason: "enamel: 욕조 단독",
      detail: mats.filter((s) => /욕조|에나멜/.test(s)).join(" · "),
    });
  }

  if (compat.has("carpet") && mats.some((s) => /^섬유$/.test(s.trim())) && !mats.some((s) => /카페트|카펫|직물|패브릭|타일카펫|합성섬유/.test(s))) {
    hits.push({
      productId: p.id,
      name: p.name,
      reason: "carpet: 섬유 단독",
      detail: mats.filter((s) => /섬유|카페|카펫|직물/.test(s)).join(" · "),
    });
  }

  // 목록에는 있는데 원문 금지와 충돌
  for (const m of db.materials) {
    const listed = listProductsForMaterial(m.id).some((x) => x.id === p.id);
    if (!listed) continue;
    if (m.id === "pvc-deco") {
      const forbidsAll =
        forb.some((s) => /리놀륨/.test(s)) &&
        forb.some((s) => /데코타일|PVC\s*바닥|합성수지/.test(s));
      const allowsAny =
        mats.some((s) => /리놀륨/.test(s)) ||
        mats.some((s) => /데코타일|PVC\s*계?\s*데코|PVC\s*바닥|탄성\s*바닥/.test(s));
      if (forbidsAll && allowsAny) {
        hits.push({
          productId: p.id,
          name: p.name,
          reason: "pvc-deco: 허용·금지 동시(목록 점검)",
          detail: `mat=${mats.filter((s) => /리놀|데코|PVC|탄성/.test(s)).join("|")} forb=${forb.filter((s) => /리놀|데코|PVC|합성/.test(s)).join("|")}`,
        });
      }
    }
    if (m.id === "chrome-faucet" && forb.some((s) => /크롬|수전/.test(s))) {
      hits.push({
        productId: p.id,
        name: p.name,
        reason: "chrome-faucet: 금지인데 목록",
        detail: forb.filter((s) => /크롬|수전/.test(s)).join(" · "),
      });
    }
    if (m.id === "marble" && forb.some((s) => /대리석|라임스톤/.test(s))) {
      hits.push({
        productId: p.id,
        name: p.name,
        reason: "marble: 금지인데 목록",
        detail: forb.filter((s) => /대리|라임/.test(s)).join(" · "),
      });
    }
  }
}

console.log("=== 재질별 적용 제품 수 ===");
for (const m of db.materials) {
  const n = listProductsForMaterial(m.id).length;
  const names = listProductsForMaterial(m.id)
    .map((p) => p.name.replace(/\(.*\)/, "").trim())
    .join(", ");
  if (n > 0) console.log(`${String(n).padStart(3)}  ${m.id.padEnd(16)} ${names}`);
}

console.log("\n=== 의심 매핑 ===");
if (!hits.length) {
  console.log("(없음)");
} else {
  for (const h of hits) {
    console.log(`- [${h.reason}] ${h.name}`);
    if (h.detail) console.log(`  ${h.detail}`);
  }
  console.log(`\n총 ${hits.length}건`);
}
