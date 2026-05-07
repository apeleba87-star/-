-- 회사 정보 확장 + 직원(회사 멤버) 관리 기반.
-- companies: 표시명/연락처/주소/로고 추가.
-- roles: admin/field/viewer 코드 도입(기존 owner/manager → admin, staff → field 로 매핑).
-- users(cleanidex 멤버): display_name, invited_at 추가.

ALTER TABLE cleanidex.companies
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

COMMENT ON COLUMN cleanidex.companies.display_name IS '대시보드/이메일 등에서 노출되는 표시명. 비어 있으면 name 사용.';
COMMENT ON COLUMN cleanidex.companies.logo_path IS 'Supabase Storage cleanidex-private 안에서의 경로(선택).';

ALTER TABLE cleanidex.users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

INSERT INTO cleanidex.roles (code, name)
VALUES
  ('admin',  '관리자'),
  ('field',  '현장 작업자'),
  ('viewer', '뷰어')
ON CONFLICT (code) DO NOTHING;

-- 기존 사용자 역할 매핑(이미 admin/field/viewer 면 변경 없음).
UPDATE cleanidex.users u
SET role_id = (SELECT id FROM cleanidex.roles WHERE code = 'admin')
WHERE u.role_id IN (
  SELECT id FROM cleanidex.roles WHERE code IN ('owner', 'manager')
);

UPDATE cleanidex.users u
SET role_id = (SELECT id FROM cleanidex.roles WHERE code = 'field')
WHERE u.role_id IN (
  SELECT id FROM cleanidex.roles WHERE code = 'staff'
);

CREATE INDEX IF NOT EXISTS idx_cleanidex_users_company_active
  ON cleanidex.users(company_id, is_active);

-- 조회 편의용: my_context는 기존 정의를 그대로 사용 (roles.code 매핑 그대로 통과).
