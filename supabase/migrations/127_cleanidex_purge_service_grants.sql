-- 휴지통 영구 삭제 cron(/api/cron/cleanidex-purge-trashed-contracts)이 service_role로
-- contracts/contract_signatures/contract_sign_requests/files 를 DELETE 합니다.
-- 마이그 125 에서 SELECT/UPDATE/INSERT 만 부여했으므로 DELETE 권한을 추가합니다.

GRANT DELETE ON TABLE cleanidex.contracts TO service_role;
GRANT DELETE ON TABLE cleanidex.contract_signatures TO service_role;
GRANT DELETE ON TABLE cleanidex.contract_sign_requests TO service_role;
GRANT DELETE ON TABLE cleanidex.files TO service_role;
