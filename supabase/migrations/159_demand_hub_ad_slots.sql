-- 입주레이더 허브 광고 슬롯

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'radar_pulse_below',
    '입주레이더 · 전국 펄스 아래 (지역 찾기 위)',
    false,
    'direct'
  ),
  (
    'radar_empty_state',
    '입주레이더 · 지역 미선택 빈 화면',
    false,
    'direct'
  ),
  (
    'radar_table_below',
    '입주레이더 · 지표 상세 표 아래 (로그인)',
    false,
    'direct'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
