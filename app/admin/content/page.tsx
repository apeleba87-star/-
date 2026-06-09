import AdminHubLanding from "@/components/admin/AdminHubLanding";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

const hub = ADMIN_HUBS.find((h) => h.id === "content")!;

export default function AdminContentHubPage() {
  return <AdminHubLanding hub={hub} />;
}
