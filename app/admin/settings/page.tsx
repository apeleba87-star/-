import AdminHubLanding from "@/components/admin/AdminHubLanding";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

const hub = ADMIN_HUBS.find((h) => h.id === "settings")!;

export default function AdminSettingsHubPage() {
  return <AdminHubLanding hub={hub} />;
}
