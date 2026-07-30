import type { Chair } from '@/types/chair';

export type MarkerVariant =
  | 'base'
  | 'charge'
  | 'table'
  | 'wheelchair'
  | 'charge-table'
  | 'charge-wheelchair'
  | 'table-wheelchair'
  | 'charge-table-wheelchair';

export type MarkerPalette = {
  base: string;
  charge: string;
  table: string;
  wheelchair: string;
};

export const MARKER_PALETTE: MarkerPalette = {
  base: '#9CA3AF',
  charge: '#F59E0B',
  table: '#2FA37C',
  wheelchair: '#2563EB',
};

export function getMarkerVariant(chair: Pick<Chair, 'hasOutlet' | 'hasTable' | 'hasWheelchairParking'>): MarkerVariant {
  const charge = chair.hasOutlet;
  const table = chair.hasTable;
  const wheelchair = chair.hasWheelchairParking;

  if (charge && table && wheelchair) return 'charge-table-wheelchair';
  if (charge && table) return 'charge-table';
  if (charge && wheelchair) return 'charge-wheelchair';
  if (table && wheelchair) return 'table-wheelchair';
  if (charge) return 'charge';
  if (table) return 'table';
  if (wheelchair) return 'wheelchair';
  return 'base';
}

export function isPillMarker(variant: MarkerVariant) {
  return variant === 'charge-table' || variant === 'charge-table-wheelchair';
}

export function hasWheelchairBadge(variant: MarkerVariant) {
  return variant === 'charge-wheelchair' || variant === 'table-wheelchair' || variant === 'charge-table-wheelchair';
}

export function isChargeTableMarker(variant: MarkerVariant) {
  return variant === 'charge-table' || variant === 'charge-table-wheelchair';
}
