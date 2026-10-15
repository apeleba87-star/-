-- 스마트스토어 등록 제품 2/3 — 케이앤에스·하이진·태영바이오켐 (docs/smartstore-research/04~05)
-- 공식 자료가 없는 센트로지·그린세본·L크린·MC-250·TAS-350·논슬립크리너 KH-420PS·슈즈크린은 보류

insert into cleaning_products (
  id, origin, brand, name, aliases, ph_type, ph_approx, summary, main_use,
  compatible_material_ids, contaminant_ids, forbidden_material_ids,
  materials_raw, contaminants_raw, forbidden_raw,
  standard_dilution, strong_dilution, dwell_time, pack_sizes, warnings,
  confidence, status
) values
-- 04. 케이앤에스 · 하이진
(
  'kns-go-star', 'admin', '케이앤에스', '고스타 (Go Star)',
  array['고스타', '케이앤에스 고스타', '킴엔에스 고스타', 'Go Star', 'Gostar'],
  'acid', '산성',
  '계면활성제와 산으로 대·소변기의 녹·얼룩·요석·때를 제거하는 산성 변기 세정제.',
  array['변기', '소변기'],
  array['porcelain', 'ceramic-tile'],
  array['limescale', 'water-spot', 'rust', 'odor'],
  array['marble', 'granite', 'concrete'],
  array['도기(변기·소변기)'],
  array['요석', '녹', '얼룩', '때'],
  array['대리석', '금속(장시간 접촉)'],
  '원액 (변기당 약 33 g)', null, '30초~',
  array['18.75L', '1L'],
  array[
    '변기 물을 한 번 빼고 충분히 부은 뒤 30초 두었다가 자루걸레로 문지르고 헹군다.',
    '락스 등 염소계 제품과 혼합하지 않는다.',
    '대리석·금속에 오래 닿지 않게 한다.'
  ],
  'medium', 'active'
),
(
  'kns-go-star-prime', 'admin', '케이앤에스', '고스타 프라임 (Go-star Prime)',
  array['고스타 프라임', '고스타프라임', '케이앤에스 고스타프라임', 'Go-star Prime'],
  'acid', '확인 필요 (요석 제거용)',
  '친환경 인증을 받은 화장실 전용 세정제. 소변기·변기 요석·물때, 화장실 바닥, 타일 줄눈의 때·녹을 제거한다. 계면활성제·살균제·탈취제 함유, 부식성 없음.',
  array['소변기', '변기', '화장실 바닥', '타일 줄눈'],
  array['porcelain', 'ceramic-tile', 'grout'],
  array['limescale', 'water-spot', 'odor', 'rust'],
  array['marble'],
  array['도기', '타일', '줄눈'],
  array['요석', '물때', '녹'],
  array['대리석'],
  '원액 (변기당 약 10 mL)', null, '10~20분 (찌든 요석)',
  array['18.75L', '1L'],
  array[
    '붓고 솔로 문지른 뒤 물로 씻는다. 찌든 요석은 10~20분 침투시킨다.',
    '락스 등 염소계 제품과 혼합하지 않는다.'
  ],
  'medium', 'active'
),
(
  'kns-speed-remover-n', 'admin', '케이앤에스', '스피드리무버 N',
  array['스피드리무버', '스피드리무버N', '스피드 리무버', 'Speed Remover N'],
  'unknown', '용제형',
  '껌·스티커·선팅필름·본드 등 아크릴계·PVA계·천연고무계 접착제에 침투해 녹이는 용제형 접착제 제거제.',
  array['스티커·껌 제거', '선팅필름 잔여물', '본드 자국'],
  array['glass', 'stainless', 'ceramic-tile', 'porcelain', 'concrete'],
  array['adhesive'],
  array['painted-wall', 'plastic', 'pvc-deco'],
  array['바닥', '금속', '유리'],
  array['껌', '스티커', '선팅필름', '본드'],
  array['도장면', '플라스틱', '고무 바닥(테스트 필요)'],
  '원액', null, '약 10분',
  array['3.75L', '550ml'],
  array[
    '반드시 원액으로 쓰고 다른 제품과 섞지 않는다.',
    '가연성 용제 — 화기 근처에서 쓰지 않는다.',
    '도장면·플라스틱·고무 바닥은 녹을 수 있으니 먼저 테스트한다.',
    '분사 후 약 10분 두고 헤라·수세미로 제거한다.'
  ],
  'high', 'active'
),
(
  'kns-radiant', 'admin', '케이앤에스', '레디안트 (Radiant)',
  array['레디안트', '케이앤에스 레디안트', 'Radiant'],
  'unknown', '확인 필요',
  '냄새가 적은 고광택 고급 바닥왁스. 빠르게 마르고 광택 지속성·내오염성·내마모성이 좋으며 황변이 없다.',
  array['바닥 광택'],
  array['pvc-deco', 'marble', 'epoxy-floor'],
  array[]::text[],
  array['laminate-wood', 'carpet'],
  array['아스타일', '대리석', '모노륨 등 륨', '테라조', '디럭스 타일', '우레탄 바닥'],
  array[]::text[],
  array['목재 바닥', '카펫'],
  '원액 2~3회 도포, 코트 간 30~40분', null, null,
  array['18.75L'],
  array[
    '박리 → 물 2회 이상 수세 → 완전 건조 후 바른다.',
    '덜 마른 상태에서 덧칠하면 광택이 사라진다.',
    '18.75L로 1회 코팅 약 350~400평.'
  ],
  'high', 'active'
),
(
  'kns-longtime', 'admin', '케이앤에스', '롱타임',
  array['롱타임', '케이앤에스 롱타임', 'Longtime'],
  'unknown', '확인 필요',
  '준공청소 현장용 경제형 자체 도막 광택제. 광택이 좋고 부드럽게 퍼지며 황변이 없다.',
  array['준공 청소 바닥 광택'],
  array['pvc-deco', 'marble', 'epoxy-floor'],
  array[]::text[],
  array['laminate-wood', 'carpet'],
  array['아스타일', '디럭스 타일', '대리석', '테라조', '각종 륨'],
  array[]::text[],
  array['목재 바닥', '카펫'],
  '원액 2~3회 도포', null, null,
  array['18.75L'],
  array[
    '박리 → 수세 → 완전 건조 후 2~3회 바른다.',
    '18.75L로 1회 코팅 약 350~400평.'
  ],
  'high', 'active'
),
(
  'kns-all-clean-pro-s', 'admin', '케이앤에스', '올크린프로S (All Clean Pro S)',
  array['올크린프로S', '올크린프로 S', '올크린프로', 'All Clean Pro S'],
  'neutral', '확인 필요 (왁스 손상 없음)',
  '왁스 광택층과 바닥 색을 손상하지 않는 바닥 일상관리 세정제. 대리석·정전기 방지 바닥에도 쓴다. 호텔·리조트·마트용.',
  array['바닥 일상 관리', '왁스 바닥'],
  array['pvc-deco', 'marble', 'granite', 'ceramic-tile', 'epoxy-floor'],
  array['dust'],
  array[]::text[],
  array['왁스 바닥', '대리석', '정전기 방지 바닥'],
  array['일상 오염'],
  array[]::text[],
  '1:200 (매일)', '1:150 (심한 오염)', null,
  array['18.75L'],
  array[
    '제조사 용도는 바닥 일상관리 세정이다.',
    '밝은 바닥 주간 청소는 1:300으로 쓴다.',
    '희석액으로 닦은 뒤 깨끗한 물로 다시 닦는다.'
  ],
  'medium', 'active'
),
(
  'kns-super-clean-up-power', 'admin', '케이앤에스', '슈퍼크린업파워 (Super Clean Up Power)',
  array['슈퍼크린업파워', '슈퍼크린업 파워', 'Super Clean Up Power'],
  'alkaline', '알칼리 (확인 필요)',
  '부식 방지 기능이 든 특수 공업용 탈지제. 기계 부품·공구 기름때, 공장·주차장 바닥 오일과 타이어 자국, 화재현장·터널 탄소 찌꺼기를 제거한다.',
  array['공장 바닥', '주차장 바닥', '기계 부품', '화재현장'],
  array['concrete', 'epoxy-floor', 'stainless'],
  array['grease', 'burnt-residue', 'stain-discoloration'],
  array['aluminum', 'painted-wall'],
  array['콘크리트', '에폭시', '금속 기계'],
  array['공업용 기름때', '타이어 자국', '그을음·매연'],
  array['알루미늄', '도장면'],
  '1:15', '1:5', null,
  array['18.75L', '3.75L'],
  array[
    '가벼운 때는 1:60으로 쓴다.',
    '기계 작업은 청색~적색 패드를 쓴다.'
  ],
  'high', 'active'
),
(
  'kns-oven-cleaner', 'admin', '케이앤에스', '오븐크리너 (케이앤에스)',
  array['케이앤에스 오븐크리너', '킴엔에스 오븐크리너', 'KNS 오븐크리너'],
  'alkaline', '알칼리',
  '배기후드·튀김기 주변·주방 바닥 기름때용 비유독물 오븐 세척제.',
  array['배기후드', '튀김기 주변', '주방 바닥'],
  array['stainless', 'ceramic-tile', 'porcelain'],
  array['grease', 'burnt-residue'],
  array['aluminum', 'painted-wall'],
  array['스테인리스', '타일'],
  array['주방 기름때'],
  array['알루미늄', '인조대리석', '하이그로시'],
  '라벨 확인', null, null,
  array['18.75L', '3.75L'],
  array[
    '알루미늄·인조대리석·하이그로시는 변색될 수 있다.',
    '피부에 닿으면 화상 위험 — 장갑을 착용한다.'
  ],
  'medium', 'active'
),
(
  'kns-touch-clean', 'admin', '케이앤에스', '터치크린 (Touch Clean)',
  array['터치크린', '케이앤에스 터치크린', 'Touch Clean'],
  'alkaline', '확인 필요',
  '각종 기름때와 묵은 때를 제거하고 표면을 부식으로부터 보호하는 수용성 세정제.',
  array['찌든 때', '기름때'],
  array['stainless', 'ceramic-tile', 'concrete', 'plastic'],
  array['grease', 'stain-discoloration'],
  array['painted-wall', 'laminate-wood'],
  array['스테인리스', '타일', '콘크리트', '플라스틱'],
  array['기름때', '묵은 때'],
  array['도장·도색면', '니스 표면'],
  '1:20', null, null,
  array['18.75L'],
  array[
    '도장·도색·니스 표면에는 사용하지 않는다.',
    '희석액을 기계·솔·수세미로 세정한다.'
  ],
  'medium', 'active'
),
(
  'kns-touch-clean-gold-a', 'admin', '케이앤에스', '터치크린골드A',
  array['터치크린골드A', '터치크린골드', '터치크린 골드', '엘피스OS', 'Touch Clean Gold'],
  'alkaline', 'pH 12~13 (해외 수입사 자료)',
  '조립식 판넬·가구·가전·가스레인지의 찌든 때를 지우는 저자극 다목적 세정제. 잔여물이 남지 않아 오염 재부착을 막는다. 레몬향.',
  array['판넬', '가구', '가전', '가스레인지', '벽면'],
  array['stainless', 'plastic', 'ceramic-tile', 'laminate-wood'],
  array['grease', 'nicotine', 'dust'],
  array['aluminum'],
  array['조립식 판넬', '가구', '가전', '차량 시트'],
  array['찌든 때', '기름때', '니코틴'],
  array['알루미늄(에어컨 핀 포함, 제조사 확인 전)'],
  '1:20', '원액', '2~3분',
  array['18.75L', '3.75L', '1L'],
  array[
    'pH 12~13 알칼리라 알루미늄 에어컨 핀은 부식될 수 있다. 제조사 자료에 에어컨 핀 용도가 없으므로 쓰지 않는다.',
    '도장·니스·자동차·유리는 반드시 1:20으로 희석한다.',
    '장갑·마스크·보안경을 착용한다.',
    '분사 후 2~3분 두고 마른 걸레로 닦는다.'
  ],
  'medium', 'active'
),
(
  'hygiene-neopro-rc', 'admin', '하이진', '네오프로 알씨 (NeoPro RC)',
  array['네오프로알씨', '네오프로 알씨', '네오프로알씨P', '하이진 네오프로', 'NeoPro RC'],
  'acid', '산성 (인산·염산 미함유)',
  '화장실·욕실의 물때, 요석, 비누 찌꺼기, 기름때, 타일 사이 검은 때·실리콘 변색을 제거하고 살균·탈취하는 산성 세정제. 향 지속.',
  array['화장실', '욕실', '세면대', '욕조', '변기', '소변기'],
  array['porcelain', 'ceramic-tile', 'grout', 'silicone', 'chrome-faucet'],
  array['limescale', 'soap-scum', 'water-spot', 'mold', 'odor'],
  array['marble', 'granite'],
  array['도기', '타일', '줄눈', '실리콘', '수전'],
  array['물때', '요석', '비누 찌꺼기', '기름때', '곰팡이 얼룩'],
  array['대리석'],
  '1:200', '1:50', null,
  array['18.75L', '1L'],
  array[
    '락스 등 염소계 제품과 혼합하지 않는다.',
    '대리석에 쓰지 않는다. 재질 테스트 후 사용한다.'
  ],
  'medium', 'active'
),
-- 05. 태영바이오켐
(
  'taeyoung-srs-q-plus', 'admin', '태영바이오켐', 'SRS-Q Plus 스테인리스 세정제',
  array['SRS-Q Plus', 'SRS큐플러스', '에스알에스 큐플러스', '태영 SRS'],
  'unknown', '용제형 (수용성 유기용제)',
  '수용성 유기용제가 오염에 침투해 금속이온을 봉쇄하는 스테인리스 얼룩·지문 세정제. 냄새가 거의 없다.',
  array['엘리베이터', '건물 기둥', '스테인리스 설비'],
  array['stainless', 'chrome-faucet', 'aluminum'],
  array['water-spot', 'stain-discoloration', 'grease'],
  array[]::text[],
  array['스테인리스', '금속·비철금속'],
  array['얼룩', '지문'],
  array[]::text[],
  '원액 (천에 묻혀 닦기)', null, null,
  array['500ml'],
  array['눈에 띄지 않는 곳에서 먼저 테스트한다.'],
  'medium', 'active'
),
(
  'taeyoung-s-clean', 'admin', '태영바이오켐', 'S크린 (에스크린)',
  array['S크린', '에스크린', '태영 S크린', 'S Clean'],
  'acid', '산성 (유기산)',
  '유기산 젤형 요석·백화 제거제. 변기·소변기 요석, 하수구 백화, 석회, 녹을 제거한다. 수직면 작업이 쉽고 냄새가 거의 없다.',
  array['변기', '소변기', '욕실', '배수관', '건물 바닥'],
  array['porcelain', 'ceramic-tile'],
  array['limescale', 'lime-deposit', 'rust', 'odor'],
  array['marble', 'granite', 'concrete'],
  array['도기', '타일'],
  array['요석', '백화', '석회', '녹'],
  array['대리석', '시멘트 줄눈(장시간)'],
  '원액 10~30 mL', null, '5~10분',
  array['1L', '3.8L'],
  array[
    '변기 물을 최대한 빼고 원액을 고루 바른 뒤 5~10분 두고 문질러 헹군다.',
    '락스·알칼리 약품과 함께 쓰지 않는다.',
    '줄눈 시멘트가 약해질 수 있으니 작업 후 물로 씻는다.',
    '고무장갑·보안경을 착용한다.'
  ],
  'high', 'active'
),
(
  'taeyoung-tacip-100e', 'admin', '태영바이오켐', 'TACIP-100E 배관세척제 A제',
  array['TACIP-100E', '타십 100E', '태영 배관세척제', 'TACIP 100E A제'],
  'strong_alkaline', '알칼리 (수산화나트륨)',
  '주방 하수구·사우나·화장실 배관 내부의 기름·지방·단백질·슬러지를 세척하는 알칼리 A제. 원래 식품공장 CIP용이며 산성 B제와 세트로 쓴다.',
  array['주방 하수구', '사우나 배관', '화장실 배관'],
  array['stainless', 'plastic'],
  array['grease', 'odor'],
  array['aluminum', 'brass-bronze'],
  array['철', '크롬', '니켈강', '플라스틱(유리섬유)', '스테인리스'],
  array['배관 기름', '슬러지', '칼슘·지방·단백질'],
  array['알루미늄 배관·부품'],
  '원액 4L/회, 약 40℃ 온수', null, '15~30분',
  array['18.75L', '4L'],
  array[
    '제조사는 A제 후 물로 헹구고 산성 B제로 2차 세척하는 것을 원칙으로 안내한다. A제만 쓰면 효과가 떨어진다.',
    'A제와 B제를 동시에 넣지 않는다.',
    '강알칼리 — 알루미늄 배관·부품에 쓰지 않는다.'
  ],
  'high', 'active'
),
(
  'taeyoung-tas-150', 'admin', '태영바이오켐', 'TAS-150 알루미늄 핀 세정제',
  array['TAS-150', 'TAS150', '태영 알루미늄 핀 세정제', '에어컨 핀 세정제 TAS-150'],
  'weak_alkaline', '약알칼리',
  '냉난방기 알루미늄 핀·코일 전용 약알칼리 세정제. 냄새가 거의 없고 생분해도가 높다.',
  array['에어컨 알루미늄 핀', '냉난방기 코일'],
  array['aluminum'],
  array['dust', 'grease'],
  array[]::text[],
  array['알루미늄 핀·코일'],
  array['먼지', '기름때'],
  array[]::text[],
  '물 8 : 원액 2 (증류수 권장)', null, '약 5분, 충분히 헹굼',
  array['10L', '3.8L'],
  array[
    '알루미늄은 pH 7 이상에서 부식이 빨라진다. 반드시 깨끗한 물로 충분히 헹군다.'
  ],
  'high', 'active'
),
(
  'taeyoung-wrc-100', 'admin', '태영바이오켐', 'WRC-100 발수코팅 세정제',
  array['WRC-100', 'WRC100', '태영 발수코팅제', '얼지 않는 발수코팅제'],
  'unknown', '확인 필요',
  '영하 20℃에서도 얼지 않는 유리 세정제. 발수 코팅 성분이 오염 흡착을 줄여 우기에 적합하고 김서림 방지·성에 제거에도 쓴다.',
  array['외부 유리창', '건물 유리'],
  array['glass', 'exterior-wall'],
  array['dust', 'water-spot'],
  array[]::text[],
  array['유리', '외벽'],
  array['먼지', '물자국'],
  array[]::text[],
  '라벨 확인', null, null,
  array['4L'],
  array[
    '발수 성분이 바닥에 남으면 미끄러울 수 있다. 바닥 용도는 제조사 확인 전까지 쓰지 않는다.'
  ],
  'medium', 'active'
),
(
  'taeyoung-ts-105a', 'admin', '태영바이오켐', '실리콘 소포제 TS-105A',
  array['TS-105A', '실리콘 소포제', '태영 소포제', '거품 억제제'],
  'unknown', '해당 없음',
  '습식 청소기·바닥 세척기 회수탱크 등에서 거품을 억제하는 실리콘 소포제. 세정제가 아니라 장비 보조제다.',
  array['습식 청소기 회수탱크', '바닥 세척기', '익스트랙터'],
  array[]::text[], array[]::text[], array[]::text[],
  array[]::text[], array[]::text[], array[]::text[],
  '라벨 확인', null, null,
  array['1L'],
  array[
    '세정 제품이 아니다. 장비 회수탱크의 거품을 줄이는 용도로 쓴다.',
    'MSDS는 제조사 사이트에 공개돼 있다.'
  ],
  'medium', 'active'
)
on conflict (id) do update set
  origin = excluded.origin,
  brand = excluded.brand,
  name = excluded.name,
  aliases = excluded.aliases,
  ph_type = excluded.ph_type,
  ph_approx = excluded.ph_approx,
  summary = excluded.summary,
  main_use = excluded.main_use,
  compatible_material_ids = excluded.compatible_material_ids,
  contaminant_ids = excluded.contaminant_ids,
  forbidden_material_ids = excluded.forbidden_material_ids,
  materials_raw = excluded.materials_raw,
  contaminants_raw = excluded.contaminants_raw,
  forbidden_raw = excluded.forbidden_raw,
  standard_dilution = excluded.standard_dilution,
  strong_dilution = excluded.strong_dilution,
  dwell_time = excluded.dwell_time,
  pack_sizes = excluded.pack_sizes,
  warnings = excluded.warnings,
  confidence = excluded.confidence,
  status = excluded.status,
  deleted_at = null,
  updated_at = now();

insert into knowledge_media (entity_type, entity_id, role, url, alt) values
('product', 'kns-go-star', 'cover', 'https://shop-phinf.pstatic.net/20250602_211/1748849206733MxLb0_PNG/11836874662684914_1843169717.png', '케이앤에스 고스타'),
('product', 'kns-go-star-prime', 'cover', 'https://shop-phinf.pstatic.net/20250602_269/1748849285523g1iYq_PNG/1091259079625378_1037273167.png', '케이앤에스 고스타 프라임'),
('product', 'kns-speed-remover-n', 'cover', 'https://shop-phinf.pstatic.net/20250709_284/1752040858770XaqyL_JPEG/29691754534114632_512700908.jpg', '케이앤에스 스피드리무버 N'),
('product', 'kns-radiant', 'cover', 'https://shop-phinf.pstatic.net/20250616_113/1750051553993ueO0l_PNG/4750168981074642_1303604664.png', '케이앤에스 레디안트'),
('product', 'kns-longtime', 'cover', 'https://shop-phinf.pstatic.net/20250616_42/1750051573925sGnW5_PNG/67745652726957485_759382227.png', '케이앤에스 롱타임'),
('product', 'kns-all-clean-pro-s', 'cover', 'https://shop-phinf.pstatic.net/20250616_261/17500515045526FCOl_PNG/33281358370070561_979212507.png', '케이앤에스 올크린프로S'),
('product', 'kns-super-clean-up-power', 'cover', 'https://shop-phinf.pstatic.net/20250529_138/1748494010831JNQEW_PNG/66647956433126_100026915.png', '케이앤에스 슈퍼크린업파워'),
('product', 'kns-oven-cleaner', 'cover', 'https://shop-phinf.pstatic.net/20250616_242/1750051428156gerap_PNG/84184261277308530_1044568666.png', '케이앤에스 오븐크리너'),
('product', 'kns-touch-clean', 'cover', 'https://shop-phinf.pstatic.net/20250529_76/1748494043298gdNAb_PNG/66680425097532_442176243.png', '케이앤에스 터치크린'),
('product', 'kns-touch-clean-gold-a', 'cover', 'https://shop-phinf.pstatic.net/20250529_26/1748494086532vwafO_PNG/35952603406990621_152413002.png', '케이앤에스 터치크린골드A'),
('product', 'hygiene-neopro-rc', 'cover', 'https://shop-phinf.pstatic.net/20250717_135/1752726963300ubue0_PNG/19654794784489325_1412075198.png', '하이진 네오프로 알씨'),
('product', 'taeyoung-srs-q-plus', 'cover', 'https://shop-phinf.pstatic.net/20250519_45/1747630699141BUbNR_PNG/2233787288752778_446647953.png', '태영바이오켐 SRS-Q Plus'),
('product', 'taeyoung-s-clean', 'cover', 'https://shop-phinf.pstatic.net/20250519_94/1747630712855ISHp6_JPEG/2233801001423659_1204475794.jpg', '태영바이오켐 S크린'),
('product', 'taeyoung-tacip-100e', 'cover', 'https://shop-phinf.pstatic.net/20250808_176/17546266641050M1YA_PNG/34020611172671532_704938804.png', '태영바이오켐 TACIP-100E'),
('product', 'taeyoung-tas-150', 'cover', 'https://shop-phinf.pstatic.net/20250418_200/1744940299757Byo1c_PNG/4983983245802738_954414993.png', '태영바이오켐 TAS-150'),
('product', 'taeyoung-wrc-100', 'cover', 'https://shop-phinf.pstatic.net/20250709_293/1752040426498wsbuK_PNG/22547393383814158_1795773644.png', '태영바이오켐 WRC-100'),
('product', 'taeyoung-ts-105a', 'cover', 'https://shop-phinf.pstatic.net/20250519_282/1747630798876d1pQd_JPEG/81763567020811539_1178076350.jpg', '태영바이오켐 TS-105A')
on conflict (entity_type, entity_id) where role = 'cover' do update set
  url = excluded.url,
  alt = excluded.alt,
  updated_at = now();
