import {
  MAIN_1F_MAP_BASE,
  MAIN_2F_MAP_BASE,
  MAIN_B1_MAP_BASE,
  MAIN_B2_MAP_BASE,
} from '@/lib/map-image';

export type HospitalMapOption = {
  building: string;
  floor: string;
  mapImage: string;
};

type HospitalMapEntry = HospitalMapOption & {
  labelFloor: string;
  order: number;
};

const MAIN_MAPS: HospitalMapEntry[] = [
  { building: '본관', floor: '지하2층', labelFloor: 'B2', mapImage: MAIN_B2_MAP_BASE, order: 0 },
  { building: '본관', floor: '지하1층', labelFloor: 'B1', mapImage: MAIN_B1_MAP_BASE, order: 1 },
  { building: '본관', floor: '1층', labelFloor: '1층', mapImage: MAIN_1F_MAP_BASE, order: 2 },
  { building: '본관', floor: '2층', labelFloor: '2층', mapImage: MAIN_2F_MAP_BASE, order: 3 },
];

export function normalizeHospitalFloor(floor: string) {
  const compact = floor.trim().replace(/\s+/g, '').toUpperCase();
  if (compact === 'B2' || compact === '2B' || compact === '지하2층') return '지하2층';
  if (compact === 'B1' || compact === '1B' || compact === '지하1층') return '지하1층';
  if (compact === '1' || compact === '1F' || compact === '1층') return '1층';
  if (compact === '2' || compact === '2F' || compact === '2층') return '2층';
  return floor.trim();
}

export function formatHospitalFloorLabel(floor: string) {
  const normalized = normalizeHospitalFloor(floor);
  if (normalized === '지하2층') return 'B2';
  if (normalized === '지하1층') return 'B1';
  return normalized;
}

export function getMainMapOption(floor: string) {
  const normalized = normalizeHospitalFloor(floor);
  return MAIN_MAPS.find((option) => option.floor === normalized) ?? null;
}

export function getHospitalMapImage(building: string, floor: string) {
  const mainMap = getMainMapOption(floor);
  if (building === '본관' && mainMap) {
    return mainMap.mapImage;
  }

  return null;
}

export function createHospitalMapOptions(spots: HospitalMapOption[]) {
  const options = new Map<string, HospitalMapEntry>();

  for (const mainMap of MAIN_MAPS) {
    options.set(`${mainMap.building}::${mainMap.floor}`, mainMap);
  }

  for (const spot of spots) {
    const normalizedFloor = normalizeHospitalFloor(spot.floor);
    const key = `${spot.building}::${normalizedFloor}`;
    if (!options.has(key)) {
      options.set(key, {
        building: spot.building,
        floor: normalizedFloor,
        labelFloor: formatHospitalFloorLabel(normalizedFloor),
        mapImage: spot.mapImage,
        order: MAIN_MAPS.length + options.size,
      });
    }
  }

  return Array.from(options.values())
    .sort((left, right) => {
      const leftBuildingRank = left.building === '본관' ? 0 : 1;
      const rightBuildingRank = right.building === '본관' ? 0 : 1;
      if (leftBuildingRank !== rightBuildingRank) return leftBuildingRank - rightBuildingRank;
      if (left.building !== right.building) return left.building.localeCompare(right.building, 'ko');
      if (left.order !== right.order) return left.order - right.order;
      return left.floor.localeCompare(right.floor, 'ko');
    })
    .map(({ labelFloor: _labelFloor, order: _order, ...option }) => option);
}

export function getPreferredHospitalMapOption(options: HospitalMapOption[]) {
  return (
    options.find((option) => option.building === '본관' && normalizeHospitalFloor(option.floor) === '1층') ??
    options[0] ??
    null
  );
}
