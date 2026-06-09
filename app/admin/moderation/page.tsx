import AdminHubLanding from "@/components/admin/AdminHubLanding";
import { ADMIN_HUBS } from "@/lib/admin/nav-config";

const hub = ADMIN_HUBS.find((h) => h.id === "moderation")!;

export default function AdminModerationHubPage() {
  return <AdminHubLanding hub={hub} />;
}
