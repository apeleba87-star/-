import AdminSectionTabs from "./AdminSectionTabs";

const TABS = [
  { href: "/admin/ads", label: "광고 슬롯" },
  { href: "/admin/radar-ads", label: "입주레이더 광고" },
  { href: "/admin/subscriptions", label: "구독 관리" },
  { href: "/admin/subscription-config", label: "구독 금액" },
  { href: "/admin/share-unlocks", label: "공유 열람권" },
  { href: "/admin/beta-applications", label: "베타 지원" },
];

export default function MonetizationSectionTabs() {
  return <AdminSectionTabs tabs={TABS} />;
}
