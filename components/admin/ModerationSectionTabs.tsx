import AdminSectionTabs from "./AdminSectionTabs";

const TABS = [
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/job-reports", label: "노쇼 신고" },
];

export default function ModerationSectionTabs() {
  return <AdminSectionTabs tabs={TABS} />;
}
