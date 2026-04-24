import type { MetadataRoute } from "next";
import { withAssetVersion } from "@/lib/constants/assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "テニス対戦組合せApp",
    short_name: "Tennis Matchup",
    description:
      "PCブラウザとスマホブラウザの両方で使える、ダブルス向けのテニス対戦組合せアプリです。",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#f06a3c",
    lang: "ja",
    icons: [
      {
        src: withAssetVersion("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: withAssetVersion("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
