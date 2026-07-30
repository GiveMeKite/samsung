import { NextResponse } from 'next/server';
import { deleteRestSpot, getRestSpotMapImage, getSpotById, readRestSpots, saveRestSpotImage, upsertRestSpot } from '@/lib/rest-spot-store';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  BackrestStatus,
  RestSpot,
  WheelchairAccessStatus,
  inferBackrestStatusFromTags,
  inferWheelchairAccessStatusFromTags,
} from '@/types/chair';

export const runtime = 'nodejs';

function parseBoolean(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on' || value === '1';
}

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function parseBackrestStatus(value: FormDataEntryValue | null): BackrestStatus | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value === 'yes' || value === 'no' || value === 'unknown' ? value : 'unknown';
}

function parseWheelchairAccessStatus(value: FormDataEntryValue | null): WheelchairAccessStatus | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value === 'accessible' || value === 'difficult' || value === 'unknown' ? value : 'unknown';
}

async function buildSpotFromForm(id: string, formData: FormData) {
  const current = await getSpotById(id);
  if (!current) return null;

  const allSpots = await readRestSpots();
  const building = String(formData.get('building') || current.building).trim();
  const floor = String(formData.get('floor') || current.floor).trim();
  const areaName = String(formData.get('areaName') || current.areaName).trim();
  const description = String(formData.get('description') || current.description).trim();
  const pinX = parseNumber(formData.get('pinX'));
  const pinY = parseNumber(formData.get('pinY'));
  const seatCount = parseNumber(formData.get('seatCount'));
  const hasOutlet = parseBoolean(formData.get('hasOutlet'));
  const hasTable = parseBoolean(formData.get('hasTable'));
  const isQuiet = parseBoolean(formData.get('isQuiet'));
  const tags = parseTags(formData.get('tags'));
  const backrestStatus = parseBackrestStatus(formData.get('backrestStatus'));
  const wheelchairAccessStatus = parseWheelchairAccessStatus(formData.get('wheelchairAccessStatus'));
  const file = formData.get('photo');

  const mapImage = getRestSpotMapImage(building, floor, allSpots) ?? current.mapImage;
  if (!mapImage) return null;

  let photoPath = current.photoPath;
  if (file instanceof File) {
    photoPath = await saveRestSpotImage(file, building, floor);
  }

  return {
    ...current,
    building,
    floor,
    mapImage,
    backrestStatus: backrestStatus ?? current.backrestStatus ?? inferBackrestStatusFromTags(tags.length ? tags : current.tags),
    wheelchairAccessStatus:
      wheelchairAccessStatus ?? current.wheelchairAccessStatus ?? inferWheelchairAccessStatusFromTags(tags.length ? tags : current.tags),
    pin: {
      x: typeof pinX === 'number' ? Math.round(pinX * 10) / 10 : current.pin.x,
      y: typeof pinY === 'number' ? Math.round(pinY * 10) / 10 : current.pin.y,
    },
    areaName,
    description,
    photoPath,
    seatCount,
    hasOutlet,
    hasTable,
    isQuiet,
    tags,
  } satisfies RestSpot;
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = context.params;
  const formData = await request.formData();
  const spot = await buildSpotFromForm(id, formData);
  if (!spot) {
    return NextResponse.json({ error: '수정할 대상을 찾지 못했습니다.' }, { status: 404 });
  }

  await upsertRestSpot(spot);
  return NextResponse.json({ spot });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = context.params;
  const deleted = await deleteRestSpot(id);
  if (!deleted) {
    return NextResponse.json({ error: '삭제할 대상을 찾지 못했습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
