import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STORAGE_BUCKET = "cleanidex-private";
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_BATCH_LIMIT = 50;
const MAX_BATCH_LIMIT = 200;

type ContractRow = {
  id: string;
  company_id: string;
  source_pdf_file_id: string | null;
  signed_pdf_file_id: string | null;
  owner_signature_file_id: string | null;
  owner_signed_pdf_file_id: string | null;
  final_pdf_file_id: string | null;
  deleted_at: string;
};

type FileRow = { id: string; file_path: string | null };

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get("dry_run") === "1";
  const retentionRaw = Number(sp.get("retention_days") ?? "");
  const retentionDays = Number.isFinite(retentionRaw) && retentionRaw > 0
    ? Math.min(365, Math.floor(retentionRaw))
    : DEFAULT_RETENTION_DAYS;
  const limitRaw = Number(sp.get("limit") ?? "");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(MAX_BATCH_LIMIT, Math.floor(limitRaw))
    : DEFAULT_BATCH_LIMIT;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceSupabase();

  const { data: candidates, error: selectErr } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select(
      "id, company_id, source_pdf_file_id, signed_pdf_file_id, owner_signature_file_id, owner_signed_pdf_file_id, final_pdf_file_id, deleted_at",
    )
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .order("deleted_at", { ascending: true })
    .limit(limit);

  if (selectErr) {
    return NextResponse.json({ ok: false, error: selectErr.message }, { status: 500 });
  }

  const rows = (candidates ?? []) as ContractRow[];
  if (!rows.length) {
    return NextResponse.json({
      ok: true,
      retention_days: retentionDays,
      cutoff,
      processed: 0,
      message: "no_contracts_due",
    });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      retention_days: retentionDays,
      cutoff,
      candidate_count: rows.length,
      candidate_ids: rows.map((r) => r.id),
    });
  }

  const summary = {
    processed: 0,
    deleted_contracts: 0,
    deleted_files: 0,
    deleted_storage_objects: 0,
    failures: [] as Array<{ contract_id: string; error: string }>,
  };

  for (const contract of rows) {
    summary.processed += 1;
    try {
      const contractFileIds = [
        contract.source_pdf_file_id,
        contract.signed_pdf_file_id,
        contract.owner_signature_file_id,
        contract.owner_signed_pdf_file_id,
        contract.final_pdf_file_id,
      ].filter((x): x is string => typeof x === "string" && x.length > 0);

      const { data: signatureRows, error: sigErr } = await supabase
        .schema("cleanidex")
        .from("contract_signatures")
        .select("id, signature_file_id")
        .eq("contract_id", contract.id);
      if (sigErr) throw new Error(`signature_lookup_failed: ${sigErr.message}`);

      const signatureFileIds = (signatureRows ?? [])
        .map((r) => r.signature_file_id as string | null)
        .filter((x): x is string => typeof x === "string" && x.length > 0);

      const fileIds = Array.from(new Set([...contractFileIds, ...signatureFileIds]));

      let filePaths: string[] = [];
      if (fileIds.length > 0) {
        const { data: fileRows, error: fileErr } = await supabase
          .schema("cleanidex")
          .from("files")
          .select("id, file_path")
          .in("id", fileIds);
        if (fileErr) throw new Error(`file_lookup_failed: ${fileErr.message}`);
        filePaths = ((fileRows ?? []) as FileRow[])
          .map((r) => r.file_path)
          .filter((x): x is string => typeof x === "string" && x.length > 0);
      }

      // 1. 계약 행 삭제 (CASCADE 로 contract_sign_requests, contract_signatures 함께 제거).
      //    files 의 FK 는 ON DELETE SET NULL 이므로 contracts 가 먼저 사라지면 파일을 안전하게 지울 수 있음.
      const { error: delContractErr } = await supabase
        .schema("cleanidex")
        .from("contracts")
        .delete()
        .eq("id", contract.id);
      if (delContractErr) throw new Error(`contract_delete_failed: ${delContractErr.message}`);
      summary.deleted_contracts += 1;

      // 2. Storage 객체 정리. 실패해도 file 행 정리는 진행 — 나중에 재실행해도 안전한 형태로 둠.
      if (filePaths.length > 0) {
        const { data: removed, error: storageErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filePaths);
        if (storageErr) {
          summary.failures.push({
            contract_id: contract.id,
            error: `storage_remove_partial: ${storageErr.message}`,
          });
        } else {
          summary.deleted_storage_objects += removed?.length ?? 0;
        }
      }

      // 3. 파일 메타 행 삭제.
      if (fileIds.length > 0) {
        const { error: delFilesErr, count } = await supabase
          .schema("cleanidex")
          .from("files")
          .delete({ count: "exact" })
          .in("id", fileIds);
        if (delFilesErr) {
          summary.failures.push({
            contract_id: contract.id,
            error: `files_delete_failed: ${delFilesErr.message}`,
          });
        } else {
          summary.deleted_files += count ?? 0;
        }
      }

      await supabase.schema("cleanidex").from("audit_logs").insert({
        company_id: contract.company_id,
        actor_user_id: null,
        action: "contract_purged",
        target_table: "contracts",
        target_id: contract.id,
        metadata: {
          retention_days: retentionDays,
          deleted_at: contract.deleted_at,
          file_ids: fileIds,
        },
      });
    } catch (e) {
      summary.failures.push({
        contract_id: contract.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: summary.failures.length === 0,
    retention_days: retentionDays,
    cutoff,
    ...summary,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
