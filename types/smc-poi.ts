export type PoiCategory =
  | 'clinic'
  | 'exam'
  | 'service'
  | 'convenience'
  | 'entrance'
  | 'transport'
  | 'connection'
  | 'facility'
  | 'pharmacy'
  | 'ward'
  | 'emergency'
  | 'medical'
  | 'amenity'
  | 'rest'
  | 'other';

export type CoordinateSystem = {
  width: number;
  height: number;
};

export type AlternatePoiPosition = {
  x: number;
  y: number;
  label?: string;
};

export type SmcMain1fPoi = {
  id: string;
  name: string;
  x: number | null;
  y: number | null;
  category: PoiCategory;
  categoryColor: PoiCategory;
  deptNo?: number;
  description?: string;
  tags?: string[];
  nearbyPoiIds?: string[];
  alternatePositions?: AlternatePoiPosition[];
  building?: string;
  floor?: string;
  mapImage?: string;
  seatCount?: number | null;
  photoUrl?: string;
  hasOutlet?: boolean;
  isQuiet?: boolean;
};

export type SmcMain1fPoisFile = {
  sourceUrl: string;
  sourcePageRule: string;
  mapImagePathFromSource: string;
  building: string;
  floor: string;
  coordinateSystem: CoordinateSystem;
  pois: SmcMain1fPoi[];
};

export type SmcMain1fRestSpot = SmcMain1fPoi & {
  category: 'rest';
  categoryColor: 'rest';
  description: string;
  photoUrl: string;
  seatCount?: number | null;
  hasOutlet?: boolean;
  isQuiet?: boolean;
};
