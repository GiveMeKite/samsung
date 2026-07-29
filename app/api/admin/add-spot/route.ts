import { NextResponse } from 'next/server';
import { buildSpotIdPrefix, createMapOptions, getNextSpotId, readRestSpots, saveRestSpotImage, sanitizeTags, appendRestSpot } from '@/lib/rest-spot-store';
import { isAdminRequest } from '@/lib/admin-auth';
import { RestSpot } from '@/types/chair';

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
  return sanitizeTags(value.split(','));
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const building = String(formData.get('building') || '').trim();
    const floor = String(formData.get('floor') || '').trim();
    const areaName = String(formData.get('areaName') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const pinX = parseNumber(formData.get('pinX'));
    const pinY = parseNumber(formData.get('pinY'));
    const seatCount = parseNumber(formData.get('seatCount'));
    const hasOutlet = parseBoolean(formData.get('hasOutlet'));
    const isQuiet = parseBoolean(formData.get('isQuiet'));
    const tags = parseTags(formData.get('tags'));
    const file = formData.get('photo');

    if (!building || !floor || !areaName || !description) {
      return NextResponse.json({ error: '필수 입력값을 모두 채워주세요.' }, { status: 400 });
    }

    if (typeof pinX !== 'number' || typeof pinY !== 'number') {
      return NextResponse.json({ error: '핀 좌표가 필요합니다.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '사진 파일을 선택해주세요.' }, { status: 400 });
    }

    const spots = await readRestSpots();
    const mapImage = spots.find((spot) => spot.building === building && spot.floor === floor)?.mapImage;
    if (!mapImage) {
      return NextResponse.json({ error: '선택한 건물/층의 약도 이미지를 찾지 못했습니다.' }, { status: 400 });
    }

    const photoPath = await saveRestSpotImage(file, building, floor);
    const id = await getNextSpotId(building, floor);
    const newSpot: RestSpot = {
      id,
      building,
      floor,
      mapImage,
      pin: {
        x: Math.round(pinX * 10) / 10,
        y: Math.round(pinY * 10) / 10,
      },
      areaName,
      description,
      photoPath,
      seatCount,
      hasOutlet,
      isQuiet,
      tags,
    };

    await appendRestSpot(newSpot);
    return NextResponse.json({ spot: newSpot, prefix: buildSpotIdPrefix(building, floor), mapOptions: createMapOptions(await readRestSpots()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '새 휴식공간을 저장하지 못했습니다.' }, { status: 500 });
  }
}
