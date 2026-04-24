const DEFAULT_ASSET_VERSION = "dev";

export const ASSET_VERSION =
  process.env.NEXT_PUBLIC_ASSET_VERSION?.trim() || DEFAULT_ASSET_VERSION;

export function withAssetVersion(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}assetv=${encodeURIComponent(ASSET_VERSION)}`;
}
