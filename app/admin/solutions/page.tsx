import AdminSolutionsPanel from "@/components/admin/AdminSolutionsPanel";
import { listContaminants } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { getSolutionsDb, getSolutionPath, listSolutionPages } from "@/lib/knowledge-hub/solutions";
import {
  getDbContaminantMasters,
  listAllDbSolutionPages,
} from "@/lib/knowledge-hub/solutions/solution-store";

export default async function AdminSolutionsPage() {
  const db = getSolutionsDb();
  const seedMasters = db.contaminantMasters;
  const [dbMasters, dbPages, products] = await Promise.all([
    getDbContaminantMasters(),
    listAllDbSolutionPages(),
    listMergedProducts(),
  ]);
  const masterMap = new Map(seedMasters.map((m) => [m.contaminantId, m]));
  for (const m of dbMasters) masterMap.set(m.contaminantId, m);

  const seedPages = listSolutionPages({ publishedOnly: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AdminSolutionsPanel
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        contaminants={listContaminants().map((c) => ({ id: c.id, name: c.name }))}
        masters={[...masterMap.values()]}
        seedPages={seedPages.map((p) => ({
          ...p,
          path: getSolutionPath(p),
          source: "seed" as const,
        }))}
        dbPages={dbPages.map((p) => ({
          ...p,
          path: getSolutionPath(p),
          source: "db" as const,
        }))}
      />
    </div>
  );
}
