import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
import Footer from "@/components/Footer";
import SupabaseSessionRefresh from "@/components/auth/SupabaseSessionRefresh";
import { getBaseUrl, defaultTitle, defaultDescription, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultDescription,
  keywords: ["청소업", "입찰", "방역", "청소 입찰", "나라장터", "견적", "현장거래", "클린아이덱스"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
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
      <body className={`${notoSansKr.className} flex min-h-screen min-w-0 flex-col antialiased`}>
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
