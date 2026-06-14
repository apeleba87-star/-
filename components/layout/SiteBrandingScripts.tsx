"use client";

import Script from "next/script";
import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getBaseUrl, defaultDescription, SITE_NAME } from "@/lib/seo";
import { isNeutralMagamSurface } from "@/lib/magam/surface";

function SiteBrandingScriptsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") ?? null;
  const neutral = useMemo(() => isNeutralMagamSurface(pathname, from), [pathname, from]);

  if (neutral) return null;

  return (
    <Script
      id="ld-json-site"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          alternateName: "Cleanidex",
          url: getBaseUrl(),
          description: defaultDescription,
          inLanguage: "ko-KR",
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: getBaseUrl(),
          },
        }),
      }}
    />
  );
}

export default function SiteBrandingScripts() {
  return (
    <Suspense fallback={null}>
      <SiteBrandingScriptsInner />
    </Suspense>
  );
}
