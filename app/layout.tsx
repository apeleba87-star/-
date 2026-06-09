import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupabaseSessionRefresh from "@/components/auth/SupabaseSessionRefresh";
import { getBaseUrl, defaultTitle, defaultDescription, SITE_NAME, seoKeywords } from "@/lib/seo";

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
        {/* AdSense 검증 — next/script 대신 head에 script 태그 직접 삽입 (크롤러 HTML 소스 확인) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4236788855275924"
          crossOrigin="anonymous"
        />
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
        <SupabaseSessionRefresh />
        <Header />
        <main className="flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col items-stretch pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] lg:pt-[calc(4.5rem+env(safe-area-inset-top,0px))] xl:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
