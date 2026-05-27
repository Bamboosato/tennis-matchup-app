import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, IBM_Plex_Sans_JP } from "next/font/google";
import { PwaSplashScreen } from "@/components/pwa/PwaSplashScreen";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { APP_ICON_192_SRC, APP_ICON_512_SRC } from "@/lib/constants/assets";
import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = IBM_Plex_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "テニス対戦組合せApp",
  description:
    "PCブラウザとスマホブラウザの両方で使える、ダブルス向けのテニス対戦組合せアプリです。",
  applicationName: "テニス対戦組合せApp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "テニス対戦組合せApp",
  },
  icons: {
    icon: [
      {
        url: APP_ICON_192_SRC,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: APP_ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: APP_ICON_192_SRC,
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <PwaSplashScreen />
        {children}
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
