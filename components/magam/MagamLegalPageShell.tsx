import type { ReactNode } from "react";

import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { MAGAM_SETTINGS_PATH } from "@/lib/magam/back-href";

type Props = {
  title: string;
  children: ReactNode;
};

export default function MagamLegalPageShell({ title, children }: Props) {
  return (
    <div className="min-h-[100dvh] bg-[#F2F3F6] text-[#141824] antialiased">
      <div className="mx-auto w-full max-w-lg px-4 pt-3 pb-10">
        <MagamPageHeader title={title} backHref={MAGAM_SETTINGS_PATH} />
        <div className="rounded-2xl border border-[#E3E6EC] bg-white p-5 shadow-sm sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
