import AdminHubLanding from "@/components/admin/AdminHubLanding";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

const hub = ADMIN_HUBS.find((h) => h.id === "data")!;

export default function AdminDataHubPage() {
  return <AdminHubLanding hub={hub} />;
}
