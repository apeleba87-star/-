import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import SiteShell from "@/components/layout/SiteShell";
import SiteBrandingScripts from "@/components/layout/SiteBrandingScripts";
import RadarAdPlacementPreviewBoot from "@/components/advertise/RadarAdPlacementPreviewBoot";
import SupabaseSessionRefresh from "@/components/auth/SupabaseSessionRefresh";
import { getBaseUrl, defaultTitle, defaultDescription, SITE_NAME, seoKeywords } from "@/lib/seo";
import { sitePwaMetadata } from "@/lib/site/pwa-manifest";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteDisplay = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-site-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultDescription,
  keywords: seoKeywords,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: getBaseUrl(),
    siteName: SITE_NAME,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: "UO9z3IKVF-hrc9UgeQdQLQpywP2-Wdirz9JSt8YIlKY",
    other: {
      "naver-site-verification": "65362145d76a61658a74462be699cdab2ea9d1d6",
    },
  },
  ...sitePwaMetadata(),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* AdSense — NEXT_PUBLIC_ADSENSE_ENABLED=true 일 때만 로드 (Auto ads 포함 광고 차단) */}
        {process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" ? (
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4236788855275924"
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body
        className={`${notoSansKr.className} ${siteDisplay.variable} flex min-h-screen min-w-0 flex-col antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JXV9GMLMEZ"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-JXV9GMLMEZ');`}
        </Script>
        {/* Naver Analytics */}
        <Script id="naver-analytics" strategy="afterInteractive">
          {`if(!window.wcs_add) window.wcs_add = {};
window.wcs_add["wa"] = "1b37d6dbad0a760";
(function(){
  var s = document.createElement("script");
  s.src = "https://wcs.pstatic.net/wcslog.js";
  s.onload = function(){ if(window.wcs) window.wcs_do(); };
  document.head.appendChild(s);
})();`}
        </Script>
        <SiteBrandingScripts />
        <SupabaseSessionRefresh />
        <RadarAdPlacementPreviewBoot />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
