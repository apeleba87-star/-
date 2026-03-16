-- 기존 저장 데이터를 새 구조/정책에 맞게 보정

-- 1. listing_incidents: 이미 처리된 거래 완료 신고(approval_status NULL) → approved
--    (컬럼 추가 전 생성된 deal_completed는 당시 즉시 마감 처리되었으므로 승인된 것으로 간주)
UPDATE public.listing_incidents
SET approval_status = 'approved'
WHERE incident_type = 'deal_completed'
  AND (approval_status IS NULL OR approval_status = '');

-- 2. categories: listings에서 참조 중인 카테고리를 현장거래용(usage='listing')으로 통일
--    (현장거래 유형/업무종류가 관리자 현장거래 카테고리에서만 보이도록)
UPDATE public.categories c
SET usage = 'listing'
WHERE c.usage = 'default'
  AND (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.category_main_id = c.id)
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.category_sub_id = c.id)
  );
