import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans_JP } from "next/font/google";
import { withAssetVersion } from "@/lib/constants/assets";
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
  manifest: withAssetVersion("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "テニス対戦組合せApp",
  },
  icons: {
    icon: [
      {
        url: withAssetVersion("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: withAssetVersion("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: withAssetVersion("/icons/icon-192.png"),
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
      <body>{children}</body>
    </html>
  );
}
