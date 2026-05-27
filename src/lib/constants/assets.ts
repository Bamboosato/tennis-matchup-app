const DEFAULT_ASSET_VERSION = "dev";
const APP_ICON_VERSION = "transparent-v1";

export const ASSET_VERSION =
  process.env.NEXT_PUBLIC_ASSET_VERSION?.trim() || DEFAULT_ASSET_VERSION;

export const APP_ICON_192_SRC = `/icons/icon-192.png?iconv=${APP_ICON_VERSION}`;
export const APP_ICON_512_SRC = `/icons/icon-512.png?iconv=${APP_ICON_VERSION}`;

export function withAssetVersion(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}assetv=${encodeURIComponent(ASSET_VERSION)}`;
}
