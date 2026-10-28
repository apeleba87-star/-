# -*- coding: utf-8 -*-
"""키엘 전 제품 — 교육용 데이터베이스 내보내기."""
from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "lib" / "knowledge-hub" / "cleaning-knowledge" / "source"
OUT = ROOT / "exports" / "kiehl-education"
OUT.mkdir(parents=True, exist_ok=True)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def is_kiehl(p: dict) -> bool:
    id_ = str(p.get("id") or "")
    brand = str(p.get("brand") or "")
    name = str(p.get("name") or "")
    return id_.startswith("kiehl-") or bool(re.search(r"키엘|kiehl", brand + name, re.I))


def join(xs, sep="; ") -> str:
    if not xs:
        return ""
    return sep.join(str(x) for x in xs)


def format_steps(steps) -> str:
    if not steps:
        return ""
    out = []
    for s in steps:
        if isinstance(s, dict):
            order = s.get("order") or ""
            stage = s.get("stage") or ""
            content = s.get("content") or s.get("text") or ""
            prefix = ".".join(str(x) for x in [order, stage] if x)
            out.append(f"{prefix}: {content}".strip(": ") if prefix else str(content))
        else:
            out.append(str(s))
    return " → ".join(out)


PH_KO = {
    "alkaline": "알칼리성",
    "acidic": "산성",
    "acid": "산성",
    "strong_acid": "강산성",
    "strong_alkaline": "강알칼리성",
    "neutral": "중성",
    "solvent": "용제형",
    "unknown": "미분류",
    None: "미분류",
    "": "미분류",
}

CATEGORY_ORDER = [
    "욕실·화장실",
    "욕실·정련",
    "산성·석회",
    "유리·외창",
    "다목적",
    "바닥·유지관리",
    "바닥·집중세정",
    "목재·가구",
    "주방·기름때",
    "금속·광택",
    "녹·철분",
    "카펫·섬유",
    "특수·용제",
    "산업·다목적",
    "기타",
]


# id → 교육 분류 (제품 정체성 우선)
ID_CATEGORY = {
    "kiehl-sanikal": "욕실·화장실",
    "kiehl-avenis-foam": "욕실·화장실",
    "kiehl-powerfix-gel": "욕실·화장실",
    "kiehl-santex": "욕실·화장실",
    "kiehl-jet": "욕실·정련",
    "kiehl-jet-active": "욕실·정련",
    "kiehl-kallinex": "산성·석회",
    "kiehl-binoxin-eco": "산성·석회",
    "kiehl-oxycal": "산성·석회",
    "kiehl-glasking": "유리·외창",
    "kiehl-glassqueen": "유리·외창",
    "kiehl-tornado": "다목적",
    "kiehl-veryprop": "바닥·유지관리",
    "kiehl-clarida-uni": "바닥·유지관리",
    "kiehl-torvan": "바닥·유지관리",
    "kiehl-econa": "다목적",
    "kiehl-dopomat": "바닥·유지관리",
    "kiehl-parketto-clean": "목재·가구",
    "kiehl-parketto-care": "목재·가구",
    "kiehl-presto": "목재·가구",
    "kiehl-exonforte": "주방·기름때",
    "kiehl-graset": "주방·기름때",
    "kiehl-kobet": "바닥·집중세정",
    "kiehl-vinoxin": "금속·광택",
    "kiehl-eloxa-prima": "금속·광택",
    "kiehl-ruginoff": "녹·철분",
    "kiehl-tablefit": "특수·용제",
    "kiehl-extrafit": "특수·용제",
    "kiehl-orange-pro": "특수·용제",
    "kiehl-carp-deta": "카펫·섬유",
    "kiehl-rivas": "카펫·섬유",
    "kiehl-rivamat": "산업·다목적",
}


def edu_category(p: dict) -> str:
    pid = str(p.get("id") or "")
    if pid in ID_CATEGORY:
        return ID_CATEGORY[pid]
    name = (p.get("name") or "")
    blob = f"{name} {p.get('summary') or ''}"
    rules = [
        ("욕실·화장실", r"사니칼|산텍스|아베니스|파워픽스|변기|요석"),
        ("유리·외창", r"글라스|Glas"),
        ("주방·기름때", r"그라셋|엑손|Xon|Grasset|주방|기름"),
        ("바닥·유지관리", r"베리프롭|클라리다|토르반|도포마트|Veriprop|Torvan"),
        ("목재·가구", r"파케토|프레스토|Parketto|Presto|목재"),
        ("금속·광택", r"비녹|엘록사|Vinoxin|Eloxa"),
        ("녹·철분", r"루긴|Rugin"),
        ("카펫·섬유", r"카프데타|리바스|Carp|Rivas|카펫"),
        ("특수·용제", r"테이블피트|엑스트라|오렌지|Tablefit|Orange|스티커"),
        ("다목적", r"토네이도|에코나|Tornado|Econa"),
    ]
    for cat, pat in rules:
        if re.search(pat, blob, re.I):
            return cat
    return "기타"


def main() -> None:
    products_all = load(SRC / "products.parsed.json")
    procedures_all = load(SRC / "product-procedures.parsed.json")
    cases_all = load(SRC / "cases.parsed.json")

    products = [p for p in products_all if is_kiehl(p)]
    kiehl_ids = {p["id"] for p in products}
    procedures = [r for r in procedures_all if r.get("productId") in kiehl_ids]
    cases = []
    for c in cases_all:
        s = json.dumps(c, ensure_ascii=False)
        if re.search(r"kiehl|키엘", s, re.I) or any(
            i in kiehl_ids for i in (c.get("productIds") or [])
        ):
            cases.append(c)

    product_rows = []
    for p in products:
        product_rows.append(
            {
                "교육분류": edu_category(p),
                "제품ID": p.get("id"),
                "제품명": p.get("name"),
                "영문/별칭": join(p.get("aliases") or []),
                "한줄요약": p.get("summary") or "",
                "pH유형": PH_KO.get(p.get("phType"), p.get("phType") or ""),
                "pH상세": (p.get("phApprox") or "").replace(" / ", " · "),
                "표준희석": p.get("standardDilution") or "",
                "강력희석": p.get("strongDilution") or "",
                "희석비목록": join(p.get("dilutions") or [], ", "),
                "규격": join(p.get("packSizes") or [], ", "),
                "주요용도": join(p.get("mainUse") or []),
                "적용재질": join(p.get("materialsRaw") or []),
                "제거오염": join(p.get("contaminantsRaw") or []),
                "사용불가": join(p.get("forbiddenRaw") or []),
                "사용장소": join(p.get("placeHints") or []),
                "주의사항": join(p.get("warnings") or [], " / "),
                "상태": p.get("status") or "",
            }
        )

    product_rows.sort(
        key=lambda r: (
            CATEGORY_ORDER.index(r["교육분류"])
            if r["교육분류"] in CATEGORY_ORDER
            else 99,
            r["제품명"] or "",
        )
    )

    fields = list(product_rows[0].keys())
    with (OUT / "01-제품카탈로그.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(product_rows)

    quick_fields = [
        "교육분류",
        "제품명",
        "한줄요약",
        "pH유형",
        "표준희석",
        "강력희석",
        "규격",
        "주요용도",
        "사용불가",
        "주의사항",
    ]
    with (OUT / "02-교육용빠른참조.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as f:
        w = csv.DictWriter(f, fieldnames=quick_fields)
        w.writeheader()
        for r in product_rows:
            w.writerow({k: r[k] for k in quick_fields})

    name_by_id = {p["id"]: p.get("name") for p in products}
    proc_rows = []
    for r in procedures:
        proc_rows.append(
            {
                "제품ID": r.get("productId"),
                "제품명": name_by_id.get(r.get("productId"), ""),
                "절차ID": r.get("id"),
                "제목": r.get("seoTitle") or r.get("slug") or "",
                "요약": r.get("summary") or "",
                "희석비": r.get("dilution") or "",
                "반응시간": r.get("dwellTime") or "",
                "현장/영역": r.get("field") or "",
                "오염": r.get("contaminantId") or "",
                "재질": r.get("materialId") or "",
                "도구": join(r.get("tools") or []),
                "단계": format_steps(r.get("steps") or []),
                "주의": join(r.get("warnings") or [], " / "),
            }
        )
    proc_rows.sort(key=lambda x: (x["제품명"] or "", x["제목"] or ""))
    with (OUT / "03-사용절차.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=list(proc_rows[0].keys()) if proc_rows else ["제품ID"]
        )
        w.writeheader()
        w.writerows(proc_rows)

    case_rows = []
    for c in cases:
        linked = [(name_by_id.get(i) or i) for i in (c.get("productIds") or [])]
        if not linked:
            linked = c.get("productNames") or []
        case_rows.append(
            {
                "사례ID": c.get("id"),
                "사례명": c.get("name"),
                "대분류": c.get("categoryMajor") or "",
                "중분류": c.get("categoryMid") or "",
                "소분류": c.get("categoryMinor") or "",
                "시설": c.get("facility") or "",
                "구역": c.get("area") or "",
                "연결제품": join(linked),
                "오염": join(c.get("contaminantRaw") or c.get("contaminantIds") or []),
                "재질": join(c.get("materialRaw") or c.get("materialIds") or []),
                "희석비": c.get("dilution") or "",
                "반응시간": c.get("dwell") or "",
                "결과": c.get("result") or "",
                "단계": format_steps(c.get("steps") or []),
                "주의": join(c.get("warnings") or [], " / "),
            }
        )
    with (OUT / "04-현장사례.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=list(case_rows[0].keys()) if case_rows else ["사례ID"]
        )
        w.writeheader()
        w.writerows(case_rows)

    with (OUT / "05-희석비매트릭스.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as f:
        w = csv.writer(f)
        w.writerow(
            [
                "교육분류",
                "제품명",
                "pH유형",
                "표준(유지관리)",
                "강력(집중)",
                "전체희석비",
                "사용불가재질",
            ]
        )
        for r in product_rows:
            w.writerow(
                [
                    r["교육분류"],
                    r["제품명"],
                    r["pH유형"],
                    r["표준희석"],
                    r["강력희석"],
                    r["희석비목록"],
                    r["사용불가"],
                ]
            )

    by_cat: dict[str, list[str]] = {}
    for r in product_rows:
        by_cat.setdefault(r["교육분류"], []).append(r["제품ID"])

    generated_at = datetime.now(timezone.utc).isoformat()
    prod_map = {p["id"]: p for p in products}

    edu_json = {
        "meta": {
            "title": "독일 키엘(Kiehl) 전 제품 — 교육용 데이터베이스",
            "purpose": "교육 자료 제작용. 제품·희석·절차·사례를 분류별로 정리.",
            "generatedAt": generated_at,
            "manufacturer": "Johannes KIEHL KG (독일)",
            "counts": {
                "products": len(products),
                "procedures": len(procedures),
                "cases": len(cases),
                "categories": len(by_cat),
            },
        },
        "categories": [],
        "products": [],
        "procedures": procedures,
        "cases": cases,
    }
    for cat in CATEGORY_ORDER:
        if cat in by_cat:
            edu_json["categories"].append(
                {"name": cat, "productIds": by_cat[cat], "count": len(by_cat[cat])}
            )
    for extra in sorted(set(by_cat) - set(CATEGORY_ORDER)):
        edu_json["categories"].append(
            {"name": extra, "productIds": by_cat[extra], "count": len(by_cat[extra])}
        )

    for r in product_rows:
        p = prod_map[r["제품ID"]]
        edu_json["products"].append(
            {
                "id": p.get("id"),
                "brand": p.get("brand"),
                "name": p.get("name"),
                "aliases": p.get("aliases") or [],
                "summary": p.get("summary") or "",
                "phApprox": p.get("phApprox"),
                "phType": p.get("phType"),
                "phTypeKo": r["pH유형"],
                "eduCategory": r["교육분류"],
                "standardDilution": p.get("standardDilution"),
                "strongDilution": p.get("strongDilution"),
                "dilutions": p.get("dilutions") or [],
                "packSizes": p.get("packSizes") or [],
                "mainUse": p.get("mainUse") or [],
                "materialsRaw": p.get("materialsRaw") or [],
                "contaminantsRaw": p.get("contaminantsRaw") or [],
                "forbiddenRaw": p.get("forbiddenRaw") or [],
                "placeHints": p.get("placeHints") or [],
                "warnings": p.get("warnings") or [],
                "status": p.get("status"),
                "procedureIds": [
                    x["id"] for x in procedures if x.get("productId") == p["id"]
                ],
                "caseIds": [
                    c["id"]
                    for c in cases
                    if p["id"] in (c.get("productIds") or [])
                ],
            }
        )

    (OUT / "kiehl-education-full.json").write_text(
        json.dumps(edu_json, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    md: list[str] = [
        "# 독일 키엘(Kiehl) 전 제품 — 교육용 데이터베이스",
        "",
        f"> 생성: {generated_at}",
        f"> 제품 **{len(products)}** · 절차 **{len(procedures)}** · 사례 **{len(cases)}**",
        "> 제조사: Johannes KIEHL KG (독일)",
        "",
        "## 교육 자료로 쓰는 법",
        "1. `02-교육용빠른참조.csv` — 교안·슬라이드용 한 장 요약",
        "2. `05-희석비매트릭스.csv` — 희석비 암기/시험용",
        "3. `01-제품카탈로그.csv` — 전체 속성 상세",
        "4. `03-사용절차.csv` / `04-현장사례.csv` — 실습·사례 교육",
        "5. `kiehl-education-full.json` — 자동화·다른 AI 입력",
        "",
        "## 분류별 제품 목차",
    ]
    for cat in CATEGORY_ORDER:
        ids = by_cat.get(cat) or []
        if not ids:
            continue
        md.append(f"### {cat} ({len(ids)})")
        for pid in ids:
            p = prod_map[pid]
            md.append(
                f"- **{p['name']}** — 표준 `{p.get('standardDilution') or '-'}` "
                f"/ 강력 `{p.get('strongDilution') or '-'}` · "
                f"{PH_KO.get(p.get('phType'), '')}"
            )
        md.append("")

    md.extend(["---", "", "## 제품 상세 (교육 카드)", ""])
    for r in product_rows:
        p = prod_map[r["제품ID"]]
        md.append(f"### {p['name']}")
        md.append("")
        md.append(
            f"- 분류: {r['교육분류']} · pH: {r['pH유형']} ({r['pH상세'] or '-'})"
        )
        md.append(f"- 요약: {r['한줄요약']}")
        md.append(
            f"- 희석: 표준 **{r['표준희석'] or '-'}** / 강력 **{r['강력희석'] or '-'}**"
        )
        if r["희석비목록"]:
            md.append(f"- 희석비 전체: {r['희석비목록']}")
        md.append(f"- 규격: {r['규격'] or '-'}")
        md.append(f"- 주요 용도: {r['주요용도'] or '-'}")
        md.append(f"- 적용 재질: {r['적용재질'] or '-'}")
        md.append(f"- 제거 오염: {r['제거오염'] or '-'}")
        md.append(f"- 사용 불가: {r['사용불가'] or '-'}")
        if r["주의사항"]:
            md.append(f"- 주의: {r['주의사항']}")
        md.append("")

    (OUT / "00-교육가이드.md").write_text("\n".join(md), encoding="utf-8")

    (OUT / "README.md").write_text(
        f"""# 키엘 전 제품 — 교육용 데이터베이스

교육 자료 제작용으로 정리한 키엘(Johannes KIEHL KG) 제품 패키지입니다.

| 파일 | 용도 |
|------|------|
| `00-교육가이드.md` | 분류별 목차 + 제품 교육 카드 |
| `01-제품카탈로그.csv` | 전 제품 상세 속성 (엑셀/구글시트) |
| `02-교육용빠른참조.csv` | 교안·슬라이드용 요약 |
| `03-사용절차.csv` | 제품별 사용·희석 절차 |
| `04-현장사례.csv` | 현장 사례 |
| `05-희석비매트릭스.csv` | 희석비 암기/시험용 |
| `kiehl-education-full.json` | 전체 JSON |

- 제품: **{len(products)}**
- 절차: **{len(procedures)}**
- 사례: **{len(cases)}**
- 생성: {generated_at}

CSV는 UTF-8 BOM이라 엑셀에서 한글이 바로 열립니다.

다시 만들기:

```bash
python scripts/export-kiehl-education.py
```
""",
        encoding="utf-8",
    )

    (ROOT / "exports" / "README.md").write_text(
        f"""# 키엘 내보내기 파일

## 교육용 (추천)
폴더: `exports/kiehl-education/`

| 파일 | 용도 |
|------|------|
| `kiehl-education/00-교육가이드.md` | 분류별 교육 가이드 |
| `kiehl-education/01-제품카탈로그.csv` | 전 제품 DB (엑셀) |
| `kiehl-education/02-교육용빠른참조.csv` | 교안용 요약 |
| `kiehl-education/03-사용절차.csv` | 사용 절차 |
| `kiehl-education/04-현장사례.csv` | 현장 사례 |
| `kiehl-education/05-희석비매트릭스.csv` | 희석비표 |
| `kiehl-education/kiehl-education-full.json` | 전체 JSON |

제품 {len(products)} · 절차 {len(procedures)} · 사례 {len(cases)}

## 기존 전체 지식 내보내기
| 파일 | 용도 |
|------|------|
| `kiehl-knowledge-full.json` | AI/스크립트 입력용 |
| `kiehl-knowledge-full.md` | 사람이 읽기용 정리본 |

다시 만들기:
- 교육용: `python scripts/export-kiehl-education.py`
- 전체 지식: `node scripts/export-kiehl-knowledge.mjs`
""",
        encoding="utf-8",
    )

    # zip for easy download
    import zipfile

    zip_path = ROOT / "exports" / "kiehl-education.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(OUT.iterdir()):
            if f.is_file():
                zf.write(f, arcname=f"kiehl-education/{f.name}")

    print("OUT", OUT)
    print("ZIP", zip_path, zip_path.stat().st_size)
    print("products", len(products), "procedures", len(procedures), "cases", len(cases))
    print("categories:")
    for cat in CATEGORY_ORDER:
        if cat in by_cat:
            print(f"  {cat}: {len(by_cat[cat])}")
    for f in sorted(OUT.iterdir()):
        print(f"  {f.name} ({f.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
