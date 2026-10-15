# 02. 이콜랩(Ecolab) 조사

조사일 2026-10-15 · 근거: 이콜랩 해외 SDS·제품시트, 한국이콜랩 공식 대리점(안심공간·벨킨스·강원에프앤씨) 제품 페이지

## 요약 표

| # | 제품 | 분류 | pH(원액) | 핵심 용도 | 신뢰도 |
|---|---|---|---|---|---|
| 1 | 데타판 매직 | 세정제 (주방세제) | 확인 안 됨 | 과일·채소·식기 세척 | low (공식 자료 없음) |
| 2 | 새니타이징 워시앤워크 KR | 세정제 (살균 겸용) | 확인 안 됨 (약알칼리 추정) | 주방 바닥 기름때 효소분해·살균, 무헹굼 | high |
| 3 | 노바산 | 세정제 (살균 겸용) | 약알칼리 (4급 암모늄) | 다목적 바닥·표면 세정·소독·탈취 | high |
| 4 | 메달리온 | 코팅·왁스·실러 (금속 광택제) | 해당 없음 (오일계) | 스테인리스·금속 광택·보호막 | high (⚠️ 향 표기 다름) |
| 5 | 엔콤파스 | 세정제 | 자료마다 다름 (⚠️) | 후드·오븐 기름때 제거 | medium |
| 6 | 오븐크리너 그리즈커터 | 세정제 | 12.9~13.9 | 오븐·그릴·후드 강력 탈지 | high |
| 7 | 오븐크리너 매직 | 세정제 | 알칼리 (NaOH <1%) | 주방 기름때 거품 세척 | high |
| 8 | 오븐크리너 EX | 세정제 | 알칼리 | 주방·식품공장 기름때 (비유독물) | medium |
| 9 | 오븐크리너 NC | 세정제 | 확인 안 됨 | 기름때 제거 | low |
| 10 | 오븐크리너 R | 세정제 | 확인 안 됨 | 후드·오븐 기름때 제거 | low |
| 11 | 오아시스 137 | 세정제 | 7.2~9.0 (희석 7.0~8.3) | 오렌지 다목적 기름때 세정 | high |
| 12 | 라벤더 매직 | 기타(비세정) — 방향·탈취제 | 해당 없음 | 공간·섬유 탈취, 방향 | high |
| 13 | 인토 후레쉬 | 세정제 | 0.4~0.7 (희석 2.1~2.8) | 화장실 산성 세정·석회·요석 제거 | high (⚠️ 스토어 "다목적") |
| 14 | 케어스트립 | 박리제 | 강알칼리 | 바닥 왁스(피니시) 박리 | high |
| 15 | 하이퍼포먼스 크리너 / 퀵필 310 | 세정제 | 중성 (6.5~9.3) | 무헹굼 중성 바닥 세정 | medium (⚠️ 제품 특정 필요) |
| 16 | 헬리오스 브릴런트 | 세정제 (연마 광택) | 약산성 | 스테인리스·세라믹 상판 얼룩·석회 제거+광택 | high |

헬리오스 브릴런트는 리스팅이 2개(500ml 단품, 500ml×6)로 제품 하나로 묶었습니다.

---

### 1. 데타판 매직 — 세정제 (주방세제)
- 스토어 리스팅: 9285461660 14kg 38,000원 ("과일 채소 식기 조리기구 세척")
- 대표이미지: https://shop-phinf.pstatic.net/20230927_273/16957977792827Wt37_PNG/771344103961429_282604898.png
- 제조사: 한국이콜랩 (영문 Deterpan Magic). 대리점 안심공간의 "사업장 청소 솔루션" 목록에 이름만 확인
- 제형 / pH / 성분: 공개된 제품 페이지·SDS를 찾지 못함
- 용도 (스토어): 과일·채소·식기·조리기구 세척 → 국내 분류상 "과일·채소용 세척제(구 1종)"로 판매되는 것으로 보임
- 클린아이덱스 관점: 청소(표면·바닥) 세정제가 아니라 **주방 설거지·식재료 세척제**입니다. 세정제품 카탈로그에 넣을지 판단 필요
- 매핑 초안: id `ecolab-deterpan-magic` / name "데타판 매직" / ph `unknown` / 재질 [porcelain, stainless, glass, plastic] / 오염 [grease] / 금지 [] / 표준 "라벨 확인" / pack ["14kg"] / low / status `verify`
- 출처: [안심공간 제품 목록](https://ansimspace.com/sanitation)

### 2. 새니타이징 워시앤워크 KR — 세정제 (살균 겸용)
- 스토어 리스팅: 9285511599 9.5kg 294,800원
- 대표이미지: https://shop-phinf.pstatic.net/20230927_79/1695798287379tVJYc_PNG/5961135188688179_547967311.png
- 제조사: Ecolab (미국 원제품 Sanitizing Wash 'n Walk, EPA 등록 세정·살균제) / 한국이콜랩 KR 버전
- 제형 / 성분: 액상, **특허 효소(enzyme) + 살균 성분**, 저거품
- 용도: 주방 바닥·배수구 일일 세척·살균. 기름때를 효소로 분해, 병원성 대장균·황색포도상구균 등 99.9% 살균, 배수구 악취 감소, 미끄럼 감소
- 제거 오염: 바닥 기름때, 배수구 악취
- 적합 재질: 주방 바닥 (타일·콘크리트·에폭시), 배수구
- 희석: **물 10L에 156 mL (약 1:64)**. 거품분무기는 물 1L + 원액 20 mL
- 방치 / 헹굼: 도포 후 3~5분 이상 접촉 → 브러시 → 스퀴지 배수 → **물로 헹구지 않음**(효소 작용 유지), 자연건조
- 주의: **반드시 찬물로 희석**(효소 보호). 건조 전 미끄러움. 권장 희석에서는 보호구 불필요(미국 기준)
- ⚠️ 스토어명의 "곰팡이 제거"는 제조사 자료에 없습니다. 제조사 용도는 바닥 기름때·배수구 세정·살균
- 매핑 초안: id `ecolab-sanitizing-wash-n-walk` / name "새니타이징 워시앤워크 KR" / ph `weak_alkaline` "확인 필요" / 재질 [ceramic-tile, grout, concrete, epoxy-floor] / 오염 [grease, odor] / 금지 [] / 표준 "1:64 (물 10L에 156 mL, 찬물)" / 방치 "3~5분 이상, 헹굼 없음" / pack ["9.5kg"] / high
- 출처: [안심공간](https://ansimspace.com/washnwalk), [벨킨스](https://velkins.imweb.me/wash_n_walk), [Ecolab US](https://www.ecolab.com/offerings/inst/kitchen-maintenance/sanitizing-wash-n-walk)

### 3. 노바산 (Novasan) — 세정제 (살균 겸용)
- 스토어 리스팅: 7342986737 20L 172,000원
- 대표이미지: https://shop-phinf.pstatic.net/20221008_172/1665192930778wg2DH_PNG/66328826509574657_1762230376.png
- 제조사: Ecolab
- 제형 / pH / 성분: 액상 / 알칼리성 / **4급 암모늄** (세척·소독·탈취 동시)
- 용도: 다목적 세정·소독제. 공장·창고·일반 바닥, 벽, 테이블·카운터, 가구, 욕실
- 적합 재질 (제조사): 왁스·합성 바닥, 목재 가구, 가죽, 플라스틱, 도자기·타일, 알루미늄, 스테인리스. 바닥 피니시(왁스)를 손상하지 않음, 줄무늬 없음
- 희석: 일반 1:125 (8 mL/L), 심한 오염 1:65 (16 mL/L), 가구·유리 1:100, 소독 15 mL/L. 한국 대리점 안내 "100배 희석(1.0~1.5%)"
- 헹굼: 16 mL/L 이상 쓰면 물로 헹굼. 식품에 직접 닿게 하지 않음
- 매핑 초안: id `ecolab-novasan` / name "노바산 (Novasan)" / ph `weak_alkaline` "약알칼리 (4급 암모늄)" / 재질 [ceramic-tile, porcelain, pvc-deco, epoxy-floor, stainless, aluminum, plastic, leather, laminate-wood] / 오염 [dust, grease, odor] / 금지 [] / 표준 "1:125 (8 mL/L)" / 강한 "1:65 (16 mL/L)" / pack ["20L"] / high
- 출처: [안심공간](https://ansimspace.com/novasan), [Pan Trading(베트남 유통)](https://mayvesinhcongnghiep.com.vn/novasan), [郁盛(대만 유통)](https://www.bar.com.tw/cleaners-ecolab-novasan.html)

### 4. 메달리온 (Medallion) — 코팅·왁스·실러 (금속 광택제)
- 스토어 리스팅: 11946883363 946ml(32oz) 18,900원 ("레몬향 금속 표면 광택")
- 대표이미지: https://shop-phinf.pstatic.net/20250610_56/1749527616940kkkJz_PNG/2407361107117317_937149233.png
- 제조사: Ecolab / 품번 6118424 (32oz×6)
- 제형: **오일계** 비에어로졸 트리거 스프레이, 비부틸 처방
- 용도: 스테인리스 세정·광택. 가벼운 오염 제거, 광택 복원, 오염·습기를 막는 보호막
- 적합 재질: 스테인리스, 알루미늄, 구리, 황동, 크롬, 은, 청동 등 모든 금속·주방기기
- 사용법: 원액 분사 → 마른 천으로 광택 날 때까지 닦음(결 방향). 오염이 심하면 먼저 석회는 라임어웨이, 기름은 그리즈커터로 제거
- 주의: 식품 접촉면은 사용 후 음용수로 헹굼
- ⚠️ 스토어명 "레몬향"과 달리 미국 유통 자료는 **알코올 향(Alcohol Scent)**으로 표기. 한국 수입품 라벨 확인 필요
- 매핑 초안: id `ecolab-medallion` / name "메달리온 (Medallion)" / ph `unknown` "오일계 (pH 해당 없음)" / 재질 [stainless, aluminum, brass-bronze, chrome-faucet] / 오염 [water-spot, dust] / 금지 [] / 표준 "원액 분사 후 마른 천으로 광택" / pack ["946ml"] / high
- 출처: [Guest Supply(이콜랩 계열)](https://www.cleanwithguestsupply.com/products/medallion), [McKesson](https://mms.mckesson.com/catalog?node=1611842166+42181915), [Western Paper](https://catalog.cdc.westernpaper.com/p/EL-6118424/Ecolab-Medallion-Stainless-Steel-Cleaner-and-Polish/)

### 5. 엔콤파스 (Encompass) — 세정제
- 스토어 리스팅: 7124563898 3.75L(1G) 47,500원 ("기름때제거제 후드세척 찌든때제거제")
- 대표이미지: https://shop-phinf.pstatic.net/20220902_108/1662105764724nYMTj_PNG/63241592553085009_1597151405.png
- 제조사: Ecolab. 같은 이름이 나라마다 처방이 다름:
  - 일본 이콜랩(모노타로): "다목적 세정제, 레인지 주변용, **약알칼리**, 3~10배 희석"
  - 남아공 Hychem 판매분: 오븐·그리들 클리너, **pH 14, 수산화나트륨 함유, 알루미늄 금지**, 1:2 희석, 50~60℃ 표면에서 1~5분
  - 미국 Encompass Heavy Duty: 다목적 강력 세정제 (0.78~50% 희석)
- 용도 (공통): 레인지 후드·오븐·그릴·환기구 기름때, 주방 바닥·벽
- 국내 가격비교 사이트에는 "중성, 피부저자극"으로 등록되어 있으나 제조사 근거 아님
- ⚠️ 한국 수입품이 어느 처방인지 라벨·MSDS로 확인 필요. 확인 전에는 알루미늄 금지로 보수적으로 매핑
- 매핑 초안: id `ecolab-encompass` / name "엔콤파스 (Encompass)" / ph `alkaline` "라벨 확인 필요" / 재질 [stainless, ceramic-tile, porcelain] / 오염 [grease, burnt-residue] / 금지 [aluminum, painted-wall] / 표준 "1:10" / 강한 "1:3" / 방치 "1~5분" / pack ["3.75L"] / medium
- 출처: [모노타로](https://www.monotaro.com/g/00978533/), [Hychem TDS](https://hychem.co.za/pdfs/msds_tds/Encompass_TDS.pdf), [SupplyItAll](https://www.supplyitall.com/908-610022.html)

### 6. 오븐크리너 그리즈커터 (Greasecutter) — 세정제
- 스토어 리스팅: 6622698295 18.75L 84,000원
- 대표이미지: https://shop-phinf.pstatic.net/20220502_84/1651476770800XaorX_PNG/52612604012528468_1069939454.png
- 제조사: Ecolab (Greasecutter / Greasecutter Plus)
- 제형 / pH / 성분: 액상 / **pH 12.9~13.9 (강알칼리)** / 수산화나트륨, 에탄올아민, 계면활성제, 용제
- 용도: 오븐·그릴·후드·환기구·튀김기·브로일러, 기름진 바닥·벽. 탄화·눌어붙은 기름때 제거
- 사용법: 원액 분사 → 두께에 따라 1~5분 (오븐 내부 10~15분) → 젖은 천으로 닦고 → **물로 헹굼**. 50℃ 정도 따뜻한 표면에서 더 빠름(오븐은 50℃ 이하에서 작업)
- 사용 불가: **알루미늄, 도장면**
- 안전: 눈 심각 손상(H318). 고무장갑·보안경·긴소매, 분무 흡입 금지
- 매핑 초안: id `ecolab-greasecutter` / name "오븐크리너 그리즈커터 (Greasecutter)" / ph `strong_alkaline` "pH 12.9~13.9" / 재질 [stainless, ceramic-tile, porcelain, concrete] / 오염 [grease, burnt-residue] / 금지 [aluminum, painted-wall, brass-bronze] / 표준 "원액 분사" / 방치 "1~5분 (오븐 내부 10~15분)" / pack ["18.75L"] / high
- 출처: [Ecolab 제품시트](https://products.ecolabsalessupport.com/embed_download/3976/aHR0cHMlM0ElMkYlMkZ3d3cuZWNvbGFiLmNvbSUyRg==/hs116l10j8uolr68df3b/GreaseCutterPlusSellSheet42143.0402.0120.pdf), [Hospeco](https://hospeco.ph/product/ecolab-greasecutter-oven-grill-cleaner-and-heavy-duty-degreaser-1-gallon-hospeco/), [덴마크 SDS](https://shop10929.sfstatic.io/upload_dir/docs/Ecolab/9042690_Ecolab_greasecutter_plus.pdf)

### 7. 오븐크리너 매직 — 세정제
- 스토어 리스팅: 8703844119 20L(20kg) 136,000원
- 대표이미지: https://shop-phinf.pstatic.net/20230613_177/1686646254958CfXNv_PNG/4307880910803708_703975842.png
- 제조사: 한국이콜랩
- 제형 / pH / 성분: 액상 / 알칼리성 / 수산화칼륨, 수산화나트륨(1% 미만) 외. 레몬향
- 분류: 위생용품관리법상 2종 세척제(식품용 기구·용기용), **비유독물**, 작업환경측정·특수건강진단 비대상
- 용도: 오븐·후드·그릴·멜라민 표면·바닥 등 주방 기름때, 인덕션·가스레인지
- 희석: 원액 또는 오염도에 따라 희석. 대리점 안내: 거품분무기에 물 450 mL + 원액 250 mL (약 1:2)
- 사용법: 도포 → 1~5분 → 스펀지·브러시 → 물 또는 젖은 행주로 충분히 헹굼
- 매핑 초안: id `ecolab-oven-cleaner-magic` / name "오븐크리너 매직" / ph `alkaline` "알칼리 (NaOH 1% 미만)" / 재질 [stainless, ceramic-tile, porcelain, plastic] / 오염 [grease, burnt-residue] / 금지 [aluminum] / 표준 "1:2 (물 450 mL + 원액 250 mL)" / 강한 "원액" / 방치 "1~5분" / pack ["20kg"] / high
- 출처: [벨킨스](https://velkins.imweb.me/oven_cleaner), [안심공간](https://ansimspace.com/ovencleaner), [강원에프앤씨](https://kangwonfnc.com/default/product_list/Product_ovencleanermagic.php), [벨킨스 이콜랩 소개](https://velkins.imweb.me/Ecolab)

### 8. 오븐크리너 EX — 세정제
- 스토어 리스팅: 8703862454 20L(20kg) 146,000원
- 대표이미지: https://shop-phinf.pstatic.net/20230613_107/1686646784407k2QN1_PNG/359235238568589_1461538836.png
- 제조사: 한국이콜랩. 공식 대리점은 **22kg**으로 표기 (스토어 20kg와 다름)
- 제형 / pH: 알칼리 거품세척제, 비유독물. 대리점에서 식품공장 COP(거품세척) 제품군으로 분류
- 용도: 기름때 제거 및 다목적 세척
- 상세 성분·희석 공개 자료 없음. 매직보다 가격이 높아 농도가 더 진한 것으로 추정되나 근거 없음
- 매핑 초안: id `ecolab-oven-cleaner-ex` / name "오븐크리너 EX" / ph `alkaline` / 재질 [stainless, ceramic-tile, porcelain] / 오염 [grease, burnt-residue] / 금지 [aluminum] / 표준 "라벨 확인" / pack ["20kg"] / medium / status `verify`
- 출처: [강원에프앤씨 제품표](https://kangwonfnc.com/default/product_list/Product_ovencleanermagic.php)

### 9. 오븐크리너 NC — 세정제
- 스토어 리스팅: 8703870054 20L(20kg) 120,000원
- 대표이미지: https://shop-phinf.pstatic.net/20230613_83/1686646911265eIEjm_PNG/1043369948474635_958026452.png
- 제조사 자료: 찾지 못함 (한국이콜랩 대리점 목록에도 없음)
- 일반 오븐크리너와 같은 알칼리 탈지제로 보이며, 알루미늄·인조대리석·장판·하이그로시 변색 주의는 동일하게 적용
- 매핑 초안: id `ecolab-oven-cleaner-nc` / ph `alkaline` / 오염 [grease, burnt-residue] / 금지 [aluminum] / pack ["20kg"] / low / status `verify`

### 10. 오븐크리너 R — 세정제
- 스토어 리스팅: 9167283494 20L(20kg) 78,000원 ("후드 오븐 기름 제거")
- 대표이미지: https://shop-phinf.pstatic.net/20230905_274/1693902690227oKMYz_PNG/18243719063390709_1129933044.png
- 제조사 자료: 찾지 못함. 이콜랩 오븐크리너 중 가장 저렴
- 매핑 초안: id `ecolab-oven-cleaner-r` / ph `alkaline` / 오염 [grease, burnt-residue] / 금지 [aluminum] / pack ["20kg"] / low / status `verify`

### 11. 오아시스 137 (Oasis 137 Orange Force) — 세정제
- 스토어 리스팅: 6721222833 99,000원 ("다목적세정제 오렌지세제")
- 대표이미지: https://shop-phinf.pstatic.net/20250519_96/1747630598001LP7aa_JPEG/344910127016914_534057097.jpg
- 제조사: Ecolab / 품번 6114559 (Oasis 137 Orange Force). 한국은 "오아시스 137G"(그린실 인증)
- 제형 / pH / 성분: 오렌지색 액상, 시트러스 향 / **pH 7.2~9.0 (희석 7.0~8.3)** / 도데실벤젠술폰산나트륨, 비이온 계면활성제, 벤질알코올 에톡실레이트, 아민 용제, 오렌지 오일. **가성소다 없음, 연마제 없음**
- 용도: 다목적 세정·탈지. 주방, 테이블, 유리창, 일반 경질 표면
- 희석: SDS 3.13~12.5% (1:31~1:7). 한국 대리점 안내 **1:16**
- 사용법: 도포 후 1분 → 헹구거나 닦음. 줄무늬 남지 않음
- 매핑 초안: id `ecolab-oasis-137` / name "오아시스 137 (Oasis 137)" / ph `weak_alkaline` "pH 7.2~9.0" / 재질 [stainless, ceramic-tile, porcelain, glass, plastic, granite] / 오염 [grease, dust] / 금지 [] / 표준 "1:16" / 강한 "1:7 (12.5%)" / 방치 "1분" / high
- 출처: [Ecolab SDS (2022)](https://www.cochise.edu/_resources/pdfs/sds-library/food-services-sv/Food-Services-SV-Student-Union-SDS-3-Oasis-137-Orange-Force-6114559-Ecolab-Apr2022.pdf), [벨킨스](https://velkins.imweb.me/Ecolab)

### 12. 라벤더 매직 — 기타(비세정): 방향·탈취제
- 스토어 리스팅: 10269474617 500ml 17,900원
- 대표이미지: https://shop-phinf.pstatic.net/20240429_85/1714376119727CBBrz_PNG/115512015459677100_2146715245.png
- 제조사: 한국이콜랩 (3in1 시리즈: 스위트모닝 / 라벤더 매직)
- 성분: 에탄올, 징크리시놀리에이트(악취 분자 중화), 스위스·프랑스 향료. 가스캔 없는 액체 스프레이
- 분류: 안전확인대상 생활화학제품
- 용도: 공간·침구·섬유·카펫·신발 냄새 탈취, 방향. 대장균·황색포도상구균·녹농균·폐렴균 항균 시험, 암모니아·트리메틸아민·폼알데하이드·담배(피리딘) 냄새 감소
- 사용법: 20~30 cm 거리에서 분무
- 클린아이덱스 관점: 세정제가 아님. 탈취 보조 제품으로만 쓰거나 제외
- 매핑 초안 (넣는 경우): id `ecolab-lavender-magic` / ph `unknown` / 재질 [carpet, leather] / 오염 [odor, nicotine] / 표준 "원액 분무 (20~30 cm)" / pack ["500ml"] / high
- 출처: [벨킨스](https://velkins.imweb.me/AirClean), [안심공간](https://ansimspace.com/3in1)

### 13. 인토 후레쉬 (Into fresh) — 세정제
- 스토어 리스팅: 6830503827 1L 8,800원 ("다목적세제 … 화장실세제 친환경세제")
- 대표이미지: https://shop-phinf.pstatic.net/20220623_287/1655973092683QI6Fn_PNG/57108926682926155_95289075.png
- 제조사: Ecolab (독일 생산)
- 제형 / pH / 성분: 연노랑 액상, 꽃향 / **pH 0.4~0.7 (희석 2.1~2.8, 강산)** / 술팜산 5~10%, 비이온 계면활성제, 에탄올. 염산 없음
- 용도: 화장실 일상·주기 세정. 석회, 요석, 비누때 제거. 변기·소변기는 원액
- 적합 재질: **산에 강한 표면만** — 도자기(위생도기), 크롬 수전, 내산 타일
- 사용 불가: 대리석·석회석 등 산에 약한 돌, 에나멜, 내산성 없는 타일
- 희석: 일상 세정 50~200 mL / 10L (1:200~1:50). 심한 석회·변기 원액. 시멘트 잔여물 제거 시 1:10까지
- 주의: 염소계(락스)와 혼합 금지
- ⚠️ 스토어명 "다목적세제·친환경세제"는 제조사 분류와 다름. 제조사 분류는 **강산성 위생실 세정제**이며 대리석에 쓰면 손상
- 매핑 초안: id `ecolab-into-fresh` / name "인토 후레쉬 (Into fresh)" / ph `strong_acid` "pH 0.4~0.7" / 재질 [porcelain, ceramic-tile, chrome-faucet, stainless] / 오염 [limescale, soap-scum, water-spot, cement-residue] / 금지 [marble, granite, enamel, concrete] / 표준 "1:100 (100 mL/10L)" / 강한 "원액 (변기·심한 석회)" / pack ["1L"] / high
- 출처: [제품설명서(독문)](https://www.clicktoclean.de/media/99/c6/77/1694606811/01000116_PRODUKTBESCHREIBUNGEN.PDF?ts=1757692926), [SDS(독문)](https://www.clicktoclean.de/media/21/bf/09/1694606811/01000116_SICHERHEITSDATENBLATT.PDF?ts=1757692926), [Bunzl 헝가리](https://webshop.bunzl.hu/huf/en/product/50020012/ecolab-into-fresh-scented-sanitary-cleaner-1l/)

### 14. 케어스트립 (Carestrip) — 박리제
- 스토어 리스팅: 7155889070 20L 121,000원 ("왁스박리제 초강력박리제")
- 대표이미지: https://shop-phinf.pstatic.net/20220908_281/166261481579667TDP_PNG/63750649609420458_526186825.png
- 제조사: Ecolab. 아시아 유통 버전은 **Carestrip NR** (미국 Care Strip L.O.는 단종)
- 제형 / 성분 (L.O. 기준): 알칼리 / 모노에탄올아민 7~13%, 페녹시에탄올 7~13%, 수산화칼륨 3~7%
- 용도: 오래된 바닥 왁스(피니시)·심한 오염 박리. 비닐(데코타일), 고무 타일, 대리석, 테라조
- 사용 불가: **목재 바닥**
- 희석: **1:5** (원액 1 : 물 5)
- 사용법: 대걸레로 넉넉히 도포 → 15분 (마르지 않게) → 폴리셔+패드 → 습식청소기 회수 → 물로 2~3회 헹굼 → 건조 후 새 왁스
- 매핑 초안: id `ecolab-carestrip` / name "케어스트립 (Carestrip)" / ph `strong_alkaline` "강알칼리" / 재질 [pvc-deco, marble, epoxy-floor, ceramic-tile] / 오염 [stain-discoloration, dust] / 금지 [laminate-wood, aluminum] / 표준 "1:5" / 방치 "15분 (마르지 않게)" / pack ["20L"] / high
- 출처: [Cleanatic(태국 유통)](https://cleanatic.com/products/carestrip-nr/), [LNP(베트남 유통)](https://vietstonecare.com/products/chat-boc-lop-phu-san-ecolab-carestrip-nr-10-lt), [Care Strip L.O. SDS](https://msdsdigital.com/system/files/CARESTRIP%20L.O.%20Floor%20Stripper.pdf)

### 15. 하이퍼포먼스 크리너 / 퀵필 310 — 세정제
- 스토어 리스팅: 6771571310 98,100원 ("하이퍼포먼스크리너 이콜랩 퀵필310 다목적세제")
- 대표이미지: https://shop-phinf.pstatic.net/20220608_135/1654667956453FNXcO_PNG/55803783982773355_1742784155.png
- ⚠️ 상품명에 서로 다른 두 제품명이 섞여 있음. 둘 다 이콜랩 **중성 무헹굼 바닥 세정제**:
  - High Performance Neutral Floor Cleaner: pH 6.5~9.3 (희석 7.0~8.5), 0.4~1.6% 희석. 비닐·석재·고무·에폭시·포세린·콘크리트·리놀륨·왁스 바닥. 한국 대리점 "500배 희석"
  - Quik Fill 310 Neutral Cleaner: 중성, 그린실 인증, 1:256~1:64 (권장 1:128). 경질·탄성 바닥, 대리석·테라조
- 공통: 헹굼 불필요, 바닥 피니시 손상·뿌옇게 됨 없음, 오토스크러버 가능
- ⚠️ 스토어명 "다목적세제"는 제조사 분류(바닥 세정제)와 다름. 대표이미지로 어느 제품인지 확정 필요
- 매핑 초안: id `ecolab-high-performance-neutral-floor-cleaner` / name "하이퍼포먼스 뉴트럴 플로어 크리너" / ph `neutral` "pH 7.0~8.5 (희석)" / 재질 [pvc-deco, marble, granite, epoxy-floor, porcelain, ceramic-tile, concrete] / 오염 [dust] / 금지 [] / 표준 "1:128" / 강한 "1:64" / medium
- 출처: [High Performance SDS](https://b2b.concordancehealthcare.com/msdspdf/SDS%20-%20Ecolab%20-%20High%20Performance%20Neutral%20Floor%20Cleaner.pdf), [제품시트](https://vmart.johnstonpaper.com/vmart/documents/specsheet/6100082-1.pdf), [Quik Fill 310](https://industrialfueguina.com/product/quik-fill-310/), [NY 그린클리닝 목록](https://online2.ogs.ny.gov/greencleaning/green-products/cleaning/2394/)

### 16. 헬리오스 브릴런트 (Helios Brillant) — 세정제 (연마 광택)
- 스토어 리스팅: 11946511409 500ml 33,000원 / 11946850711 500ml×6 165,000원
- 대표이미지: https://shop-phinf.pstatic.net/20250610_51/1749521562413U6SVA_PNG/81125987355857188_1467705294.png (6개입: …20250610_92/1749527223854VzSr1_PNG/83660026401026106_764322514.png)
- 제조사: Ecolab (유럽 제품)
- 제형 / pH: 흰색 크림 에멀전, **약한 연마제 + 약산성**, 석회 용해 성분
- 용도: 스테인리스·크롬·니켈·황동·내산 에나멜·세라믹(하이라이트) 상판의 기름때, 석회 얼룩, 물자국, 눌어붙은 음식 제거 후 광택 보호막. 도자기·세라믹 위 금속 긁힘 자국 제거
- 사용법: **원액**을 마른 천·스펀지에 묻혀 닦음 → 물로 잔여물 헹굼 → 마른 천으로 건조. 사용 전 흔들기
- 주의: 연마 성분이 있어 유리·고광택 도장면·코팅면은 흠집 가능성 (제조사 직접 금지 문구는 없음)
- 매핑 초안: id `ecolab-helios-brillant` / name "헬리오스 브릴런트 (Helios Brillant)" / ph `acid` "약산성" / 재질 [stainless, chrome-faucet, brass-bronze, enamel, porcelain] / 오염 [water-spot, limescale, grease, burnt-residue] / 금지 [painted-wall] / 표준 "원액, 천에 묻혀 사용" / pack ["500ml"] / high
- 출처: [Bunzl 독일](https://webshop.bunzl.de/eur/en/product/75060/helios-brillant-500ml-surface-cleaner-un0000/), [Ecolab d.o.o.](https://www.ecoshop.surf/en/helios-brillant-500ml.html), [Lozamet](https://lozamet.com.pl/en/stainless-furniture/cleaning-preparations/helios-brillant-en/)

---

## 확인 필요 목록

1. **데타판 매직**: 공식 자료 없음. 과일·채소·식기용 주방세제라면 청소 세정제 카탈로그에 넣을지 결정 필요
2. **오븐크리너 EX / NC / R**: 제품별 성분·희석·차이를 공개 자료로 찾지 못함. 라벨 또는 MSDS(한국이콜랩 SDS 포털) 확보 필요. EX는 공식 대리점이 22kg로 표기(스토어는 20kg)
3. **엔콤파스**: 나라별 처방이 다름(일본 약알칼리 / 남아공 pH 14). 한국 수입품 라벨 확인 필요
4. **하이퍼포먼스 크리너 / 퀵필 310**: 한 리스팅에 두 제품명. 실제 판매 제품 확정 필요
5. **메달리온**: 스토어 "레몬향" vs 미국 자료 "알코올 향"
6. **인토 후레쉬**: 스토어 "다목적·친환경" 표현 vs 제조사 강산성(pH 0.4) 위생실 세정제 → 대리석 사용 시 손상 우려, 스토어 문구 수정 권장
7. **워시앤워크**: 스토어 "곰팡이 제거" 표현은 제조사 근거 없음
8. **라벤더 매직**: 방향·탈취제(비세정). 카탈로그 포함 여부 결정 필요
