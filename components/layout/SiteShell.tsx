"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isNeutralMagamSurface } from "@/lib/magam/surface";

function SiteShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") ?? null;
  const minimal = useMemo(() => isNeutralMagamSurface(pathname, from), [pathname, from]);

  if (minimal) {
    return (
      <main className="flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col items-stretch pb-[env(safe-area-inset-bottom,0px)]">
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col items-stretch pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] lg:pt-[calc(4.5rem+env(safe-area-inset-top,0px))] xl:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        {children}
      </main>
      <Footer />
    </>
  );
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col items-stretch pb-[env(safe-area-inset-bottom,0px)]">
          {children}
        </main>
      }
    >
      <SiteShellInner>{children}</SiteShellInner>
    </Suspense>
  );
}
