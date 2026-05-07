-- 회사 정보 수정 / 직원 관리(역할·활성 토글) API는 service_role 클라이언트로 동작합니다.
-- (앱 코드에서 admin 권한을 검증한 뒤 service_role 로 UPDATE)
-- companies/users RLS 가 self/membership 기준이라 admin 이 다른 사용자 row 를 직접 수정 불가.
-- 따라서 service_role 에 명시적 GRANT 필요.

GRANT SELECT, UPDATE ON TABLE cleanidex.companies TO service_role;
GRANT SELECT, UPDATE ON TABLE cleanidex.users TO service_role;
GRANT SELECT ON TABLE cleanidex.roles TO service_role;
