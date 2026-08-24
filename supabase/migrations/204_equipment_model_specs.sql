-- 장비 기종: 상세 스펙표·추천 사용자
alter table cleaning_equipment_models
  add column if not exists specs jsonb not null default '[]'::jsonb;

alter table cleaning_equipment_models
  add column if not exists recommended_users text[] not null default '{}';

comment on column cleaning_equipment_models.specs is
  '기종 스펙표 [{ "label": "소비전력", "value": "1,400W" }, ...]';

comment on column cleaning_equipment_models.recommended_users is
  '추천 사용자·업체 유형 목록';
