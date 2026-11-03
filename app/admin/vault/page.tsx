import Link from "next/link";
import {
  VAULT_ADMIN_LINKS,
  VAULT_PAUSED_CRONS,
  VAULT_PUBLIC_PREVIEWS,
} from "@/lib/admin/vault-config";

export default function AdminVaultPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">보관함 (숨김 기능)</h1>
      <p className="mb-2 text-sm text-slate-600">
        비용이 드는 cron은 중지했고, 화면·코드는 지우지 않았습니다. 재개 전에 cron·외부 API를 다시
        켜는지 확인하세요.
      </p>
      <p className="mb-8 text-xs text-slate-500">
        정책: <code className="rounded bg-slate-100 px-1">docs/freeze-delete-checklist.md</code>
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">중지된 비용 cron</h2>
        <ul className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          {VAULT_PAUSED_CRONS.map((c) => (
            <li key={c.path}>
              <code className="text-xs">{c.path}</code>
              <span className="text-amber-800/80"> — {c.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">관리 화면</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {VAULT_ADMIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card block hover:border-slate-300 hover:shadow-sm"
            >
              <h3 className="font-medium text-slate-900">{item.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">숨긴 공개 URL (미리보기)</h2>
        <p className="mb-3 text-xs text-slate-500">
          일반 메뉴·사이트맵에서는 빠졌습니다. 직접 주소는 열릴 수 있습니다.
        </p>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {VAULT_PUBLIC_PREVIEWS.map((item) => (
            <li key={item.href} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <div>
                <Link href={item.href} className="font-medium text-teal-700 hover:underline" target="_blank">
                  {item.label}
                </Link>
                {item.description ? (
                  <p className="text-xs text-slate-500">{item.description}</p>
                ) : null}
              </div>
              <code className="text-xs text-slate-400">{item.href}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
