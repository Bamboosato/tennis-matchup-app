import type { NextConfig } from "next";

const assetVersion =
  process.env.NEXT_PUBLIC_ASSET_VERSION?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ASSET_VERSION: assetVersion,
  },
};

export default nextConfig;
