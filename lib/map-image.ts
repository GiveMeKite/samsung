export const MAIN_1F_MAP_BASE = '/maps/smc-main-1f.png';
export const MAIN_1F_MAP_SRC = `${MAIN_1F_MAP_BASE}?v=20260730`;
export const MAIN_2F_MAP_BASE = '/maps/smc-main-2f.png';
export const MAIN_2F_MAP_SRC = `${MAIN_2F_MAP_BASE}?v=20260730`;
export const MAIN_B1_MAP_BASE = '/maps/smc-main-b1.png';
export const MAIN_B1_MAP_SRC = `${MAIN_B1_MAP_BASE}?v=20260730`;
export const MAIN_B2_MAP_BASE = '/maps/smc-main-b2.png';
export const MAIN_B2_MAP_SRC = `${MAIN_B2_MAP_BASE}?v=20260730`;

export function resolveMapImageSrc(src?: string | null) {
  if (!src) return '';
  if (src === MAIN_1F_MAP_BASE) return MAIN_1F_MAP_SRC;
  if (src === MAIN_2F_MAP_BASE) return MAIN_2F_MAP_SRC;
  if (src === MAIN_B1_MAP_BASE) return MAIN_B1_MAP_SRC;
  if (src === MAIN_B2_MAP_BASE) return MAIN_B2_MAP_SRC;
  return src;
}
