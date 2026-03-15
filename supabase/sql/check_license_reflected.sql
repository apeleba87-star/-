-- Supabase SQL Editor에 복사·붙여넣기 후 실행하여 면허제한 API 반영 건수 확인

-- 1) 면허제한 API로 저장된 공고 수 (tender_industries, match_source = 'detail_api')
SELECT count(DISTINCT tender_id) AS license_reflected_count
FROM tender_industries
WHERE match_source = 'detail_api';

-- 2) primary_industry_code가 있는 입찰 건수
SELECT count(*) AS tenders_with_industry
FROM tenders
WHERE primary_industry_code IS NOT NULL;

-- 3) 최근 반영 공고 샘플 (공고번호, 차수, 업종코드, 공고명)
SELECT bid_ntce_no, bid_ntce_ord, primary_industry_code, bid_ntce_nm
FROM tenders
WHERE primary_industry_code IS NOT NULL
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;
