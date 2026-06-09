import Link from "next/link";
import type { AdminHub } from "@/lib/admin/nav-config";

export default function AdminHubLanding({ hub }: { hub: AdminHub }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{hub.label}</h1>
      <p className="mb-8 text-sm text-slate-600">{hub.description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {hub.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card block hover:border-blue-200 hover:shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
