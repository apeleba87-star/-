import AdminHubLanding from "@/components/admin/AdminHubLanding";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

const hub = ADMIN_HUBS.find((h) => h.id === "operations")!;

export default function AdminOperationsHubPage() {
  return <AdminHubLanding hub={hub} />;
}
