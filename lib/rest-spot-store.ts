import { promises as fs } from 'fs';
import path from 'path';
import { RestSpot } from '@/types/chair';

const DATA_PATH = path.join(process.cwd(), 'data', 'rest-spots.json');
const REST_SPOT_DIR = path.join(process.cwd(), 'public', 'images', 'rest-spots');

export function slugify(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[^0-9A-Za-z가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export function buildingToPrefix(building: string) {
  if (building === '본관') return 'main';
  if (building === '별관') return 'annex';
  if (building === '양성자센터') return 'proton';
  return slugify(building) || 'spot';
}

export function floorToKey(floor: string) {
  const basement = floor.match(/^(?:지하|B)(\d+)층?$/i);
  if (basement) return `b${basement[1]}`;

  const standard = floor.match(/^(\d+)층$/);
  if (standard) return `${standard[1]}f`;

  return slugify(floor) || 'floor';
}

export function buildSpotIdPrefix(building: string, floor: string) {
  return `${buildingToPrefix(building)}-${floorToKey(floor)}`;
}

export function sanitizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

export function createMapOptions(spots: RestSpot[]) {
  const options = new Map<string, { building: string; floor: string; mapImage: string }>();
  for (const spot of spots) {
    const key = `${spot.building}::${spot.floor}`;
    if (!options.has(key)) {
      options.set(key, { building: spot.building, floor: spot.floor, mapImage: spot.mapImage });
    }
  }
  return Array.from(options.values());
}

export async function readRestSpots() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw) as RestSpot[];
}

async function writeRestSpots(spots: RestSpot[]) {
  await fs.writeFile(DATA_PATH, `${JSON.stringify(spots, null, 2)}\n`, 'utf8');
}

export async function appendRestSpot(spot: RestSpot) {
  const spots = await readRestSpots();
  spots.push(spot);
  await writeRestSpots(spots);
  return spot;
}

export async function upsertRestSpot(spot: RestSpot) {
  const spots = await readRestSpots();
  const index = spots.findIndex((item) => item.id === spot.id);
  if (index >= 0) {
    spots[index] = spot;
  } else {
    spots.push(spot);
  }
  await writeRestSpots(spots);
  return spot;
}

export async function deleteRestSpot(id: string) {
  const spots = await readRestSpots();
  const nextSpots = spots.filter((spot) => spot.id !== id);
  await writeRestSpots(nextSpots);
  return spots.length !== nextSpots.length;
}

export async function getNextSpotId(building: string, floor: string) {
  const spots = await readRestSpots();
  const prefix = buildSpotIdPrefix(building, floor);
  const maxSequence = spots.reduce((max, spot) => {
    if (!spot.id.startsWith(`${prefix}-`)) return max;
    const sequence = Number(spot.id.split('-').pop());
    return Number.isFinite(sequence) && sequence > max ? sequence : max;
  }, 0);

  return `${prefix}-${String(maxSequence + 1).padStart(3, '0')}`;
}

export async function getSpotById(id: string) {
  const spots = await readRestSpots();
  return spots.find((spot) => spot.id === id) ?? null;
}

export async function saveRestSpotImage(file: File, building: string, floor: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const originalBase = file.name ? slugify(file.name.replace(/\.[^.]+$/, '')) : 'rest-spot';
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${slugify(`${building}-${floor}`)}-${timestamp}-${originalBase || 'rest-spot'}.${ext}`;
  await fs.mkdir(REST_SPOT_DIR, { recursive: true });
  await fs.writeFile(path.join(REST_SPOT_DIR, safeName), buffer);
  return `/images/rest-spots/${safeName}`;
}

export function getRestSpotMapImage(building: string, floor: string, spots: RestSpot[]) {
  return spots.find((spot) => spot.building === building && spot.floor === floor)?.mapImage ?? null;
}
