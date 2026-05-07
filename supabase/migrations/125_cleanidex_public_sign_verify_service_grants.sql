-- 공개 거래처 서명 API(/api/cleanidex/contracts/sign/verify)는 service_role 클라이언트로
-- contract_sign_requests 외에도 contracts/files/contract_signatures/audit_logs 를 만집니다.
-- 스키마 USAGE만 있고 테이블 GRANT가 없으면 "permission denied for table ..." 가 납니다.

GRANT SELECT, UPDATE ON TABLE cleanidex.contracts TO service_role;
GRANT SELECT, INSERT ON TABLE cleanidex.files TO service_role;
GRANT SELECT, INSERT ON TABLE cleanidex.contract_signatures TO service_role;
GRANT SELECT, INSERT ON TABLE cleanidex.audit_logs TO service_role;

-- 시퀀스 권한이 필요한 컬럼이 생길 경우를 대비 (UUID PK라 보통 불필요하지만 안전망).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cleanidex TO service_role;
