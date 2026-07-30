export type BackrestStatus = 'yes' | 'no' | 'unknown';
export type WheelchairAccessStatus = 'accessible' | 'difficult' | 'unknown';

export type RestSpot = {
  id: string;
  building: string;
  floor: string;
  mapImage: string;
  pin: { x: number; y: number };
  areaName: string;
  description: string;
  photoPath: string;
  seatCount: number | null;
  hasOutlet: boolean;
  hasTable?: boolean;
  hasWheelchairParking?: boolean;
  isQuiet: boolean;
  tags: string[];
  backrestStatus?: BackrestStatus;
  wheelchairAccessStatus?: WheelchairAccessStatus;
};

export type Chair = {
  id: string;
  building: string;
  floor: string;
  name: string;
  location: string;
  description: string;
  seatCount: number;
  hasBackrest: boolean;
  hasOutlet: boolean;
  hasTable: boolean;
  hasWheelchairParking: boolean;
  wheelchairAccessible: boolean;
  isQuiet: boolean;
  image: string;
  x: number;
  y: number;
  backrestStatus: BackrestStatus;
  wheelchairAccessStatus: WheelchairAccessStatus;
};

const BACKREST_KEYWORDS = ['\ubca4\uce58', '\uc758\uc790', '\uc18c\ud30c', '\ud314\uac78\uc774'];
const WHEELCHAIR_ACCESS_KEYWORDS = ['\ud718\ucc28\uc5b4', '\uc7a5\uc560\uc778', '\ubc30\ub9ac\uc5b4\ud504\ub9ac'];
const TABLE_KEYWORDS = ['\ud14c\uc774\ube14', '\uc2dd\ud0c1', '\ucc45\uc0c1', 'table', 'desk'];
const WHEELCHAIR_PARKING_KEYWORDS = ['\ud718\ucc28\uc5b4', '\ubc30\ub9ac\uc5b4\ud504\ub9ac', '\uc7a5\uc560\uc778', '\uc8fc\ucc28'];

function normalizeStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function includesAny(tags: string[], keywords: string[]) {
  return tags.some((tag) => keywords.some((keyword) => tag.includes(keyword)));
}

export function formatBackrestStatus(status: BackrestStatus) {
  switch (status) {
    case 'yes':
      return '\uc788\uc74c';
    case 'no':
      return '\uc5c6\uc74c';
    default:
      return '\ubaa8\ub984';
  }
}

export function formatWheelchairAccessStatus(status: WheelchairAccessStatus) {
  switch (status) {
    case 'accessible':
      return '\uac00\ub2a5';
    case 'difficult':
      return '\uc5b4\ub824\uc6c0';
    default:
      return '\ubaa8\ub984';
  }
}

export function inferBackrestStatusFromTags(tags: string[]) {
  return includesAny(tags, BACKREST_KEYWORDS) ? 'yes' : 'unknown';
}

export function inferWheelchairAccessStatusFromTags(tags: string[]) {
  return includesAny(tags, WHEELCHAIR_ACCESS_KEYWORDS) ? 'accessible' : 'unknown';
}

export function inferTableFromTags(tags: string[]) {
  return includesAny(tags, TABLE_KEYWORDS);
}

export function inferWheelchairParkingFromTags(tags: string[]) {
  return includesAny(tags, WHEELCHAIR_PARKING_KEYWORDS);
}

export function restSpotToChair(spot: RestSpot): Chair {
  const backrestStatus = normalizeStatus(
    spot.backrestStatus ?? (inferBackrestStatusFromTags(spot.tags) as BackrestStatus),
    ['yes', 'no', 'unknown'],
    'unknown',
  );

  const wheelchairAccessStatus = normalizeStatus(
    spot.wheelchairAccessStatus ?? (inferWheelchairAccessStatusFromTags(spot.tags) as WheelchairAccessStatus),
    ['accessible', 'difficult', 'unknown'],
    'unknown',
  );

  const hasBackrest =
    backrestStatus === 'yes' || (backrestStatus === 'unknown' && includesAny(spot.tags, BACKREST_KEYWORDS));
  const hasTable = spot.hasTable ?? inferTableFromTags(spot.tags);
  const wheelchairAccessible =
    wheelchairAccessStatus === 'accessible' ||
    (wheelchairAccessStatus === 'unknown' && includesAny(spot.tags, WHEELCHAIR_ACCESS_KEYWORDS));
  const inferredWheelchairParking = inferWheelchairParkingFromTags(spot.tags);
  const hasWheelchairParking = spot.hasWheelchairParking ?? (inferredWheelchairParking || wheelchairAccessible);

  return {
    id: spot.id,
    building: spot.building,
    floor: spot.floor,
    name: spot.areaName,
    location: `${spot.building} ${spot.floor}`,
    description: spot.description,
    seatCount: spot.seatCount ?? 0,
    hasBackrest,
    hasOutlet: spot.hasOutlet,
    hasTable,
    hasWheelchairParking,
    wheelchairAccessible,
    isQuiet: spot.isQuiet,
    image: spot.photoPath,
    x: spot.pin.x,
    y: spot.pin.y,
    backrestStatus,
    wheelchairAccessStatus,
  };
}
