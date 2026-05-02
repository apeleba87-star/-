-- 공개 서명 API(/api/cleanidex/contracts/sign/verify)는 service_role 클라이언트로 이 테이블을 조회·갱신합니다.
-- 스키마 USAGE만 있고 테이블 GRANT가 없으면 "permission denied for table contract_sign_requests" 가 납니다.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.contract_sign_requests TO service_role;
