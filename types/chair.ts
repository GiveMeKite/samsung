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
  isQuiet: boolean;
  tags: string[];
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
  wheelchairAccessible: boolean;
  isQuiet: boolean;
  image: string;
  x: number;
  y: number;
};

const wheelchairKeywords = ['휠체어', '무장애', '배리어프리'];

export function restSpotToChair(spot: RestSpot): Chair {
  const hasWheelchairFriendlyTag = spot.tags.some((tag) => wheelchairKeywords.some((keyword) => tag.includes(keyword)));

  return {
    id: spot.id,
    building: spot.building,
    floor: spot.floor,
    name: spot.areaName,
    location: `${spot.building} ${spot.floor}`,
    description: spot.description,
    seatCount: spot.seatCount ?? 0,
    hasBackrest: spot.tags.some((tag) => /벤치|의자|소파/.test(tag)),
    hasOutlet: spot.hasOutlet,
    wheelchairAccessible: hasWheelchairFriendlyTag,
    isQuiet: spot.isQuiet,
    image: spot.photoPath,
    x: spot.pin.x,
    y: spot.pin.y,
  };
}
