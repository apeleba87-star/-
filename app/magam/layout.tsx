import type { Metadata } from "next";
import { MAGAM_PRODUCT_NAME } from "@/lib/magam/brand";

export const metadata: Metadata = {
  title: {
    default: "실시간 모집",
    template: `%s | ${MAGAM_PRODUCT_NAME}`,
  },
  openGraph: {
    siteName: MAGAM_PRODUCT_NAME,
  },
};

export default function MagamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
