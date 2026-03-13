-- match_source에 detail_api 추가 (상세 API 입찰제한 기반 업종 매핑)
COMMENT ON COLUMN public.tender_industries.match_source IS 'direct_code | direct_name | alias | text_estimated | detail_api';
