import { NextResponse } from 'next/server';
import { readRestSpots } from '@/lib/rest-spot-store';
import {
  RestSpot,
  formatBackrestStatus,
  formatWheelchairAccessStatus,
  inferBackrestStatusFromTags,
  inferWheelchairAccessStatusFromTags,
} from '@/types/chair';

export const runtime = 'nodejs';

type NormalizedSpot = {
  id: string;
  building: string;
  floor: string;
  name: string;
  description: string;
  seatCount: number | null;
  outletAvailable: boolean | null;
  tableAvailable: boolean | null;
  quiet: boolean | null;
  backrestAvailable: boolean | null;
  wheelchairAccessible: boolean | null;
  wheelchairParkingAvailable: boolean | null;
  x: number | null;
  y: number | null;
};

type ChatResult = {
  answer: string;
  matchedSpotIds: string[];
  found: boolean;
  places: Array<
    Omit<NormalizedSpot, 'tags'> & {
      facts: string[];
    }
  >;
};

const FALLBACK_ANSWER = '아직 그 위치의 휴식 공간 정보가 등록되어 있지 않아요.';

function normalizeText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[\s.,!?()[\]{}"'`~\-_/\\|:;]/g, '');
}

function normalizeSpot(spot: RestSpot): NormalizedSpot | null {
  const id = typeof spot.id === 'string' ? spot.id.trim() : '';
  const building = typeof spot.building === 'string' ? spot.building.trim() : '';
  const floor = typeof spot.floor === 'string' ? spot.floor.trim() : '';
  const name = typeof spot.areaName === 'string' ? spot.areaName.trim() : '';
  if (!id || !building || !floor || !name) return null;

  const tags = Array.isArray(spot.tags) ? spot.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const text = normalizeText([spot.areaName, spot.description, ...tags].join(' '));

  return {
    id,
    building,
    floor,
    name,
    description: typeof spot.description === 'string' ? spot.description.trim() : '',
    seatCount: typeof spot.seatCount === 'number' ? spot.seatCount : null,
    outletAvailable: Boolean(spot.hasOutlet),
    tableAvailable: Boolean(spot.hasTable ?? (text.includes('테이블') || text.includes('탁자') || text.includes('식탁'))),
    quiet: Boolean(spot.isQuiet || text.includes('조용') || text.includes('한적')),
    backrestAvailable: spot.backrestStatus
      ? spot.backrestStatus === 'yes'
      : inferBackrestStatusFromTags(tags) === 'yes',
    wheelchairAccessible: spot.wheelchairAccessStatus
      ? spot.wheelchairAccessStatus === 'accessible'
      : inferWheelchairAccessStatusFromTags(tags) === 'accessible',
    wheelchairParkingAvailable: Boolean(spot.hasWheelchairParking || text.includes('휠체어') || text.includes('배리어프리')),
    x: typeof spot.pin?.x === 'number' ? spot.pin.x : null,
    y: typeof spot.pin?.y === 'number' ? spot.pin.y : null,
  };
}

function parseConditions(question: string) {
  const q = normalizeText(question);
  return {
    building: q.includes('본관') ? '본관' : q.includes('별관') ? '별관' : q.includes('양성자') ? '양성자센터' : q.includes('암병원') ? '암병원' : null,
    floor: q.includes('지하2층') || q.includes('b2') ? '지하2층' : q.includes('지하1층') || q.includes('b1') ? '지하1층' : q.includes('2층') || q.includes('2f') ? '2층' : q.includes('1층') || q.includes('1f') ? '1층' : null,
    wantsOutlet: q.includes('콘센트') || q.includes('충전'),
    wantsQuiet: q.includes('조용') || q.includes('한적'),
    wantsTable: q.includes('테이블') || q.includes('탁자') || q.includes('식탁'),
    wantsBackrest: q.includes('등받이'),
    wantsWheelchair: q.includes('휠체어') || q.includes('배리어프리') || q.includes('장애인'),
    seatMin: q.match(/(\d+)(?:석|좌석|자리)/)?.[1] ? Number(q.match(/(\d+)(?:석|좌석|자리)/)?.[1]) : null,
  };
}

function buildFacts(spot: NormalizedSpot) {
  const facts: string[] = [];
  if (spot.seatCount !== null) facts.push(`좌석 ${spot.seatCount}석`);
  if (spot.outletAvailable) facts.push('콘센트 있음');
  if (spot.tableAvailable) facts.push('테이블 있음');
  if (spot.quiet) facts.push('조용한 공간');
  if (spot.backrestAvailable) facts.push('등받이 있음');
  if (spot.wheelchairAccessible) facts.push('휠체어 접근 가능');
  if (spot.wheelchairParkingAvailable) facts.push('휠체어 주차 가능');
  return facts;
}

function matches(spot: NormalizedSpot, conditions: ReturnType<typeof parseConditions>) {
  if (conditions.building && spot.building !== conditions.building) return false;
  if (conditions.floor && spot.floor !== conditions.floor) return false;
  if (conditions.wantsOutlet && !spot.outletAvailable) return false;
  if (conditions.wantsQuiet && !spot.quiet) return false;
  if (conditions.wantsTable && !spot.tableAvailable) return false;
  if (conditions.wantsBackrest && !spot.backrestAvailable) return false;
  if (conditions.wantsWheelchair && !spot.wheelchairAccessible) return false;
  if (conditions.seatMin !== null && (spot.seatCount === null || spot.seatCount < conditions.seatMin)) return false;
  return true;
}

function score(spot: NormalizedSpot, conditions: ReturnType<typeof parseConditions>, q: string) {
  let value = 0;
  const facts: string[] = [];

  if (conditions.building && spot.building === conditions.building) value += 6;
  if (conditions.floor && spot.floor === conditions.floor) value += 6;
  if (conditions.wantsOutlet && spot.outletAvailable) {
    value += 4;
    facts.push('콘센트');
  }
  if (conditions.wantsQuiet && spot.quiet) {
    value += 4;
    facts.push('조용함');
  }
  if (conditions.wantsTable && spot.tableAvailable) {
    value += 4;
    facts.push('테이블');
  }
  if (conditions.wantsBackrest && spot.backrestAvailable) {
    value += 3;
    facts.push('등받이');
  }
  if (conditions.wantsWheelchair && spot.wheelchairAccessible) {
    value += 3;
    facts.push('휠체어 접근');
  }
  if (conditions.seatMin !== null && spot.seatCount !== null && spot.seatCount >= conditions.seatMin) {
    value += 3;
    facts.push(`좌석 ${spot.seatCount}석`);
  }
  if (q.includes(normalizeText(spot.name).slice(0, 4))) value += 2;
  if (q.includes(normalizeText(spot.description).slice(0, 4))) value += 1;

  return { value, facts: Array.from(new Set(facts)) };
}

function answerFor(question: string, spots: NormalizedSpot[]): ChatResult {
  const conditions = parseConditions(question);
  const q = normalizeText(question);
  const ranked = spots
    .map((spot) => ({ spot, ...score(spot, conditions, q) }))
    .sort((a, b) => b.value - a.value || a.spot.id.localeCompare(b.spot.id, 'ko'));

  const exact = ranked.filter((item) => matches(item.spot, conditions));
  const chosen = exact.length > 0 ? exact : ranked.filter((item) => item.value > 0).slice(0, 3);

  const answer =
    chosen.length > 0
      ? [
          conditions.building ||
          conditions.floor ||
          conditions.wantsOutlet ||
          conditions.wantsQuiet ||
          conditions.wantsTable ||
          conditions.wantsBackrest ||
          conditions.wantsWheelchair ||
          conditions.seatMin !== null
            ? `조건에 맞는 휴식공간을 ${chosen.length}곳 찾았어요.`
            : `등록된 휴식공간을 ${chosen.length}곳 찾았어요.`,
          ...chosen.map((item, index) => {
            const facts = item.facts.length ? item.facts : buildFacts(item.spot);
            const factText = facts.length ? ` (${facts.join(', ')})` : '';
            return `${index + 1}. ${item.spot.name} - ${item.spot.building} ${item.spot.floor}${factText}`;
          }),
        ].join('\n')
      : conditions.building ||
        conditions.floor ||
        conditions.wantsOutlet ||
        conditions.wantsQuiet ||
        conditions.wantsTable ||
        conditions.wantsBackrest ||
        conditions.wantsWheelchair ||
        conditions.seatMin !== null
        ? '요청하신 조건과 정확히 맞는 휴식공간은 아직 찾지 못했어요. 건물이나 층을 함께 적어주면 더 잘 찾을 수 있어요.'
        : FALLBACK_ANSWER;

  const places = chosen.map((item) => ({
    id: item.spot.id,
    building: item.spot.building,
    floor: item.spot.floor,
    name: item.spot.name,
    description: item.spot.description,
    seatCount: item.spot.seatCount,
    outletAvailable: item.spot.outletAvailable,
    tableAvailable: item.spot.tableAvailable,
    quiet: item.spot.quiet,
    backrestAvailable: item.spot.backrestAvailable,
    wheelchairAccessible: item.spot.wheelchairAccessible,
    wheelchairParkingAvailable: item.spot.wheelchairParkingAvailable,
    x: item.spot.x,
    y: item.spot.y,
    facts: item.facts.length ? item.facts : buildFacts(item.spot),
  }));

  return {
    answer,
    matchedSpotIds: places.map((place) => place.id),
    found: places.length > 0,
    places,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }

    const spots = (await readRestSpots()).map(normalizeSpot).filter((spot): spot is NormalizedSpot => Boolean(spot));
    return NextResponse.json(answerFor(question, spots), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[api/chat] unexpected error', error);
    return NextResponse.json({ error: '질문을 처리하는 중 문제가 생겼어요.' }, { status: 500 });
  }
}
