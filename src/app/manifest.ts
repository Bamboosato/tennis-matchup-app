import type { MetadataRoute } from "next";
import { APP_ICON_192_SRC, APP_ICON_512_SRC } from "@/lib/constants/assets";

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
        src: APP_ICON_192_SRC,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: APP_ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
