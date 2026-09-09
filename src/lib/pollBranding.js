import { readPollMeta } from "./pollMeta";

export const DEFAULT_PRIMARY_COLOR = "#0f766e";
export const DEFAULT_ACCENT_COLOR = "#172b2b";

export function getPollBranding(poll) {
  const pollMeta = readPollMeta(poll?.id);
  return {
    brandName: poll?.brand_name ?? pollMeta.brand_name ?? "",
    logoUrl: poll?.brand_logo_url ?? pollMeta.brand_logo_url ?? "",
    primaryColor: poll?.brand_primary_color ?? pollMeta.brand_primary_color ?? DEFAULT_PRIMARY_COLOR,
    accentColor: poll?.brand_accent_color ?? pollMeta.brand_accent_color ?? DEFAULT_ACCENT_COLOR
  };
}
