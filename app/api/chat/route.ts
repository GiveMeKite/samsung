import { createHash } from 'crypto';
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

const FALLBACK_ANSWER = '아직 그 위치의 휴식 공간 정보가 등록되어 있지 않아요.';
const CONDITION_KEYWORDS = [
  '조용',
  '콘센트',
  '충전',
  '테이블',
  '휠체어',
  '주차',
  '등받이',
  '휴식',
  '쉬어',
  '앉',
  '대기',
  '편한',
  '자리',
];

type NormalizedPlace = {
  id: string;
  building: string;
  buildingKey: string;
  floor: string;
  floorKey: string;
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

type SearchConditions = {
  building: string | null;
  floor: string | null;
  outletAvailable: boolean | null;
  tableAvailable: boolean | null;
  quiet: boolean | null;
  backrestAvailable: boolean | null;
  wheelchairAccessible: boolean | null;
  wheelchairParkingAvailable: boolean | null;
  seatCountMin: number | null;
};

type SearchResponse = {
  answer: string;
  matchedSpotIds: string[];
  found: boolean;
  places: Array<
    Omit<NormalizedPlace, 'buildingKey' | 'floorKey'> & {
      facts: string[];
    }
  >;
};

const responseCache = new Map<string, SearchResponse>();

const BUILDING_PRIORITY = new Map([
  ['본관', 0],
  ['별관', 1],
  ['암병원', 2],
  ['양성자센터', 3],
]);

const FLOOR_PRIORITY = new Map([
  ['지하2층', 0],
  ['b2', 0],
  ['지하1층', 1],
  ['b1', 1],
  ['1층', 2],
  ['1f', 2],
  ['2층', 3],
  ['2f', 3],
]);

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiCallResult =
  | {
      ok: true;
      model: string;
      endpoint: string;
      rawResponseText: string;
    }
  | {
      ok: false;
      model: string;
      endpoint: string;
      status: number | null;
      statusText: string;
      body: string;
    };

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function normalizeNullableBoolean(value: unknown) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeBuilding(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  const normalized = normalize(text);
  if (!normalized) return '';
  if (normalized.includes('양성자치료센터') || normalized.includes('양성자센터')) return '양성자센터';
  if (normalized.includes('암병원')) return '암병원';
  if (normalized.includes('별관')) return '별관';
  if (normalized.includes('본관')) return '본관';
  return text;
}

function normalizeFloor(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  const normalized = normalize(text);
  if (!normalized) return '';

  if (normalized.includes('지하2층') || normalized.includes('b2층') || normalized === 'b2' || normalized === 'b2f') {
    return '지하2층';
  }

  if (normalized.includes('지하1층') || normalized.includes('b1층') || normalized === 'b1' || normalized === 'b1f') {
    return '지하1층';
  }

  if (normalized.includes('2층') || normalized === '2f' || normalized === 'f2') {
    return '2층';
  }

  if (normalized.includes('1층') || normalized === '1f' || normalized === 'f1') {
    return '1층';
  }

  return text;
}

function normalizeTextQuestion(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s쨌.,!?()[\]{}"'`~\-_/\\|:;]/g, '');
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectBooleanCondition(question: string, positive: string[], negative: string[]) {
  const text = normalizeTextQuestion(question);
  if (includesAny(text, negative)) return false;
  if (includesAny(text, positive)) return true;
  return null;
}

function detectBuilding(question: string) {
  const text = normalizeTextQuestion(question);
  if (text.includes('양성자치료센터') || text.includes('양성자센터')) return '양성자센터';
  if (text.includes('암병원')) return '암병원';
  if (text.includes('별관')) return '별관';
  if (text.includes('본관')) return '본관';
  return null;
}

function detectFloor(question: string) {
  const text = normalizeTextQuestion(question);
  if (text.includes('지하2층') || text.includes('b2층') || text.includes('b2')) return '지하2층';
  if (text.includes('지하1층') || text.includes('b1층') || text.includes('b1')) return '지하1층';
  if (text.includes('2층') || text.includes('2f')) return '2층';
  if (text.includes('1층') || text.includes('1f')) return '1층';
  return null;
}

function detectSeatCountMin(question: string) {
  const text = normalizeTextQuestion(question);
  const match = text.match(/(\d+)(?:석|좌석|자리)/);
  return match ? Number(match[1]) : null;
}

function inferBooleanFromTags(tags: string[], positive: string[], negative: string[]) {
  const normalizedTags = tags.map(normalizeTextQuestion);
  if (normalizedTags.some((tag) => negative.some((keyword) => tag.includes(keyword)))) return false;
  if (normalizedTags.some((tag) => positive.some((keyword) => tag.includes(keyword)))) return true;
  return null;
}

function inferWheelchairParkingFromTags(tags: string[]) {
  const normalizedTags = tags.map(normalizeTextQuestion);
  if (normalizedTags.some((tag) => tag.includes('휠체어보관가능') || tag.includes('휠체어주차가능'))) return true;
  if (normalizedTags.some((tag) => tag.includes('휠체어보관불가') || tag.includes('휠체어주차불가'))) return false;
  return null;
}

function normalizeBackrestAvailability(value: unknown) {
  if (value === 'yes' || value === true) return true;
  if (value === 'no' || value === false) return false;
  return null;
}

function normalizeWheelchairAccess(value: unknown) {
  if (value === 'accessible' || value === true) return true;
  if (value === 'difficult' || value === false) return false;
  return null;
}

function normalizePlace(place: RestSpot): NormalizedPlace | null {
  const data = place as unknown as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id.trim() : '';
  const building = typeof data.building === 'string' ? data.building.trim() : '';
  const buildingKey = normalizeBuilding(data.building);
  const floor = typeof data.floor === 'string' ? data.floor.trim() : '';
  const floorKey = normalizeFloor(data.floor);
  const name = typeof data.areaName === 'string' ? data.areaName.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const seatCount = normalizeNullableNumber(data.seatCount);

  const outletAvailable =
    normalizeNullableBoolean(data.hasOutlet) ??
    inferBooleanFromTags(tags, ['콘센트', '충전'], ['콘센트없음', '충전불가', '충전없음']);
  const tableAvailable =
    normalizeNullableBoolean(data.hasTable) ??
    inferBooleanFromTags(tags, ['테이블', '탁자', '식탁'], ['테이블없음', '탁자없음', '식탁없음']);
  const quiet =
    normalizeNullableBoolean(data.isQuiet) ?? inferBooleanFromTags(tags, ['조용'], ['시끄럽', '시끄러운']);
  const backrestAvailable =
    normalizeBackrestAvailability(data.backrestStatus) ?? inferBooleanFromTags(tags, ['등받이'], ['등받이없음']);
  const wheelchairAccessible =
    normalizeWheelchairAccess(data.wheelchairAccessStatus) ??
    inferBooleanFromTags(tags, ['휠체어', '배리어프리', '장애인접근'], ['휠체어접근불가']);
  const wheelchairParkingAvailable =
    normalizeNullableBoolean(data.hasWheelchairParking) ?? inferWheelchairParkingFromTags(tags);
  const x = normalizeNullableNumber(data.pin && typeof data.pin === 'object' ? (data.pin as { x?: unknown }).x : null);
  const y = normalizeNullableNumber(data.pin && typeof data.pin === 'object' ? (data.pin as { y?: unknown }).y : null);

  if (!id || !buildingKey || !floorKey || !name) {
    return null;
  }

  return {
    id,
    building,
    buildingKey,
    floor,
    floorKey,
    name,
    description,
    seatCount,
    outletAvailable,
    tableAvailable,
    quiet,
    backrestAvailable,
    wheelchairAccessible,
    wheelchairParkingAvailable,
    x,
    y,
  };
}

function validatePlace(place: NormalizedPlace) {
  return (
    typeof place.id === 'string' &&
    place.id.length > 0 &&
    typeof place.name === 'string' &&
    place.name.trim().length > 0 &&
    typeof place.building === 'string' &&
    place.building.length > 0 &&
    typeof place.floor === 'string' &&
    place.floor.length > 0
  );
}

function deterministicPlaceSort(a: NormalizedPlace, b: NormalizedPlace) {
  const buildingDelta =
    (BUILDING_PRIORITY.get(a.buildingKey) ?? 99) - (BUILDING_PRIORITY.get(b.buildingKey) ?? 99);
  if (buildingDelta !== 0) return buildingDelta;

  const floorDelta = (FLOOR_PRIORITY.get(a.floorKey) ?? 99) - (FLOOR_PRIORITY.get(b.floorKey) ?? 99);
  if (floorDelta !== 0) return floorDelta;

  const nameDelta = a.name.localeCompare(b.name, 'ko');
  if (nameDelta !== 0) return nameDelta;

  return a.id.localeCompare(b.id, 'ko');
}

function buildPlaceFacts(place: NormalizedPlace) {
  const facts: string[] = [];

  if (place.seatCount !== null) {
    facts.push(`좌석 ${place.seatCount}석`);
  }

  if (place.outletAvailable === true) {
    facts.push('콘센트 있음');
  } else if (place.outletAvailable === false) {
    facts.push('콘센트 없음');
  }

  if (place.tableAvailable === true) {
    facts.push('테이블 있음');
  } else if (place.tableAvailable === false) {
    facts.push('테이블 없음');
  }

  if (place.quiet === true) {
    facts.push('조용한 공간');
  } else if (place.quiet === false) {
    facts.push('조용한 공간 아님');
  }

  if (place.backrestAvailable === true) {
    facts.push('등받이 있음');
  } else if (place.backrestAvailable === false) {
    facts.push('등받이 없음');
  }

  if (place.wheelchairAccessible === true) {
    facts.push('휠체어 접근 가능');
  } else if (place.wheelchairAccessible === false) {
    facts.push('휠체어 접근 불가');
  }

  if (place.wheelchairParkingAvailable === true) {
    facts.push('휠체어 주차 가능');
  } else if (place.wheelchairParkingAvailable === false) {
    facts.push('휠체어 주차 불가');
  }

  return facts;
}

function describeConditions(conditions: SearchConditions) {
  const parts: string[] = [];
  if (conditions.building) parts.push(conditions.building);
  if (conditions.floor) parts.push(conditions.floor);

  const featureParts: string[] = [];
  if (conditions.outletAvailable === true) featureParts.push('콘센트 있는');
  if (conditions.outletAvailable === false) featureParts.push('콘센트 없는');
  if (conditions.tableAvailable === true) featureParts.push('테이블 있는');
  if (conditions.tableAvailable === false) featureParts.push('테이블 없는');
  if (conditions.quiet === true) featureParts.push('조용한');
  if (conditions.quiet === false) featureParts.push('조용하지 않은');
  if (conditions.backrestAvailable === true) featureParts.push('등받이 있는');
  if (conditions.backrestAvailable === false) featureParts.push('등받이 없는');
  if (conditions.wheelchairAccessible === true) featureParts.push('휠체어 접근 가능한');
  if (conditions.wheelchairAccessible === false) featureParts.push('휠체어 접근 불가한');
  if (conditions.wheelchairParkingAvailable === true) featureParts.push('휠체어 주차 가능한');
  if (conditions.wheelchairParkingAvailable === false) featureParts.push('휠체어 주차 불가한');
  if (conditions.seatCountMin !== null) featureParts.push(`좌석 ${conditions.seatCountMin}석 이상`);

  if (!parts.length && !featureParts.length) {
    return '등록된 휴식공간';
  }

  const location = parts.join(' ');
  return [location, featureParts.join(', ')].filter(Boolean).join(' ');
}

function extractConditions(question: string): SearchConditions {
  return {
    building: detectBuilding(question),
    floor: detectFloor(question),
    outletAvailable: detectBooleanCondition(
      question,
      ['콘센트', '충전가능', '충전할수', '충전할수있는', '충전가능한'],
      ['콘센트없음', '콘센트가없', '충전불가', '충전할수없', '충전안됨'],
    ),
    tableAvailable: detectBooleanCondition(
      question,
      ['테이블', '탁자'],
      ['테이블없음', '테이블이없', '테이블가없', '탁자없음', '식탁없음'],
    ),
    quiet: detectBooleanCondition(question, ['조용', '조용한'], ['조용하지않', '시끄럽', '시끄러운']),
    backrestAvailable: detectBooleanCondition(question, ['등받이'], ['등받이없', '등받이없음', '등받이가없']),
    wheelchairAccessible: detectBooleanCondition(
      question,
      ['휠체어접근', '휠체어로갈수', '휠체어갈수', '휠체어접근가능', '장애인접근', '배리어프리'],
      ['휠체어접근불가', '휠체어로갈수없', '휠체어갈수없', '장애인접근불가', '휠체어접근어려'],
    ),
    wheelchairParkingAvailable: detectBooleanCondition(
      question,
      ['휠체어주차', '휠체어를세울수', '휠체어보관'],
      ['휠체어주차불가', '휠체어보관불가', '휠체어주차어려'],
    ),
    seatCountMin: detectSeatCountMin(question),
  };
}

function matchesConditions(place: NormalizedPlace, conditions: SearchConditions) {
  if (conditions.building !== null && place.buildingKey !== conditions.building) return false;
  if (conditions.floor !== null && place.floorKey !== conditions.floor) return false;

  const booleanFields: Array<keyof Pick<
    SearchConditions,
    | 'outletAvailable'
    | 'tableAvailable'
    | 'quiet'
    | 'backrestAvailable'
    | 'wheelchairAccessible'
    | 'wheelchairParkingAvailable'
  >> = [
    'outletAvailable',
    'tableAvailable',
    'quiet',
    'backrestAvailable',
    'wheelchairAccessible',
    'wheelchairParkingAvailable',
  ];

  for (const field of booleanFields) {
    const expected = conditions[field];
    if (expected !== null && place[field] !== expected) {
      return false;
    }
  }

  if (
    conditions.seatCountMin !== null &&
    (place.seatCount === null || place.seatCount < conditions.seatCountMin)
  ) {
    return false;
  }

  return true;
}

function rankPlaceForFallback(place: NormalizedPlace, conditions: SearchConditions) {
  let score = 0;
  const matched: string[] = [];
  const unmet: string[] = [];

  const evaluateBoolean = (
    expected: boolean | null,
    actual: boolean | null,
    label: string,
  ) => {
    if (expected === null) return;
    if (actual === expected) {
      score += 4;
      matched.push(label);
      return;
    }
    if (actual === null) return;
    score -= 1;
    unmet.push(label);
  };

  evaluateBoolean(conditions.outletAvailable, place.outletAvailable, '콘센트');
  evaluateBoolean(conditions.tableAvailable, place.tableAvailable, '테이블');
  evaluateBoolean(conditions.quiet, place.quiet, '조용함');
  evaluateBoolean(conditions.backrestAvailable, place.backrestAvailable, '등받이');
  evaluateBoolean(conditions.wheelchairAccessible, place.wheelchairAccessible, '휠체어 접근');
  evaluateBoolean(
    conditions.wheelchairParkingAvailable,
    place.wheelchairParkingAvailable,
    '휠체어 주차',
  );

  if (conditions.seatCountMin !== null) {
    if (place.seatCount !== null && place.seatCount >= conditions.seatCountMin) {
      score += 4;
      matched.push(`좌석 ${conditions.seatCountMin}개 이상`);
    } else if (place.seatCount !== null) {
      score -= 1;
      unmet.push(`좌석 ${conditions.seatCountMin}개 이상`);
    }
  }

  return { score, matched, unmet };
}

function getFallbackPlaces(places: NormalizedPlace[], conditions: SearchConditions) {
  return places
    .map((place) => ({
      place,
      ...rankPlaceForFallback(place, conditions),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || deterministicPlaceSort(a.place, b.place))
    .slice(0, 3)
    .map((entry) => entry.place);
}

function getPlacesVersion(places: NormalizedPlace[]) {
  return createHash('sha1').update(JSON.stringify(places)).digest('hex');
}

function buildSearchTerms(spot: RestSpot) {
  return [spot.building, spot.floor, spot.areaName, spot.description, ...spot.tags].map(normalize);
}

function getSpotTextBlob(spot: RestSpot) {
  return normalize([spot.areaName, spot.description, ...spot.tags].join(' '));
}

function sortSpotsById(spots: RestSpot[]) {
  return [...spots].sort((a, b) => a.id.localeCompare(b.id));
}

function extractCandidates(question: string, spots: RestSpot[]) {
  const normalizedQuestion = normalize(question);
  const buildingMatch = spots.find((spot) => normalizedQuestion.includes(normalize(spot.building)))?.building ?? '';
  const floorMatch = spots.find((spot) => normalizedQuestion.includes(normalize(spot.floor)))?.floor ?? '';

  return sortSpotsById(
    spots.filter((spot) => {
      const terms = buildSearchTerms(spot);
      const buildingOk = !buildingMatch || spot.building === buildingMatch;
      const floorOk = !floorMatch || spot.floor === floorMatch;
      const textOk = terms.some((term) => normalizedQuestion.includes(term));
      return buildingOk && floorOk && (textOk || Boolean(buildingMatch || floorMatch));
    }),
  );
}

function isConditionQuestion(question: string) {
  const normalizedQuestion = normalize(question);
  return CONDITION_KEYWORDS.some((keyword) => normalizedQuestion.includes(keyword));
}

function inferTableAvailabilityFromText(spot: RestSpot) {
  const text = getSpotTextBlob(spot);
  if (text.includes('테이블') || text.includes('탁자') || text.includes('식탁')) {
    return 'yes' as const;
  }

  if (text.includes('테이블없') || text.includes('탁자없') || text.includes('식탁없')) {
    return 'no' as const;
  }

  return 'unknown' as const;
}

function getConditionKeywords(question: string) {
  const normalizedQuestion = normalize(question);
  return CONDITION_KEYWORDS.filter((keyword) => normalizedQuestion.includes(keyword));
}

function scoreSpotForQuestion(question: string, spot: RestSpot) {
  const normalizedQuestion = normalize(question);
  const text = getSpotTextBlob(spot);
  let score = 0;
  const matchedFeatures: string[] = [];

  const askedForOutlet = normalizedQuestion.includes('콘센트') || normalizedQuestion.includes('충전');
  const askedForQuiet = normalizedQuestion.includes('조용');
  const askedForWheelchair = normalizedQuestion.includes('휠체어') || normalizedQuestion.includes('주차');
  const askedForTable = normalizedQuestion.includes('테이블');
  const askedForBackrest = normalizedQuestion.includes('등받이');
  const askedForSeating = normalizedQuestion.includes('앉') || normalizedQuestion.includes('자리') || normalizedQuestion.includes('대기');

  if (askedForOutlet && spot.hasOutlet) {
    score += 4;
    matchedFeatures.push('콘센트');
  } else if (askedForOutlet && (text.includes('콘센트') || text.includes('충전'))) {
    score += 3;
    matchedFeatures.push('콘센트');
  }

  if (askedForQuiet && spot.isQuiet) {
    score += 4;
    matchedFeatures.push('조용함');
  } else if (askedForQuiet && text.includes('조용')) {
    score += 3;
    matchedFeatures.push('조용함');
  }

  if (askedForWheelchair && spot.wheelchairAccessStatus === 'accessible') {
    score += 4;
    matchedFeatures.push('휠체어 접근');
  } else if (askedForWheelchair && text.includes('휠체어')) {
    score += 3;
    matchedFeatures.push('휠체어 접근');
  }

  const tableAvailability = inferTableAvailabilityFromText(spot);
  if (askedForTable && tableAvailability === 'yes') {
    score += 4;
    matchedFeatures.push('테이블');
  } else if (askedForTable && tableAvailability === 'unknown' && (spot.seatCount ?? 0) > 0) {
    score += 1;
    matchedFeatures.push('앉을 자리');
  }

  if (askedForBackrest) {
    if (spot.backrestStatus === 'yes') {
      score += 3;
      matchedFeatures.push('등받이');
    } else if (text.includes('등받이')) {
      score += 2;
      matchedFeatures.push('등받이');
    }
  }

  if (askedForSeating && (spot.seatCount ?? 0) > 0) {
    score += 2;
    matchedFeatures.push('좌석');
  }

  if (spot.isQuiet && normalizedQuestion.includes('편한')) {
    score += 1;
    matchedFeatures.push('편안한 분위기');
  }

  if ((spot.seatCount ?? 0) > 0 && normalizedQuestion.includes('휴식')) {
    score += 1;
    matchedFeatures.push('휴식공간');
  }

  return {
    score,
    matchedFeatures: Array.from(new Set(matchedFeatures)),
    tableAvailability,
  };
}

type GeminiSpotPromptItem = RestSpot & {
  conditionScore?: number;
  matchedFeatures?: string[];
  tableAvailability?: 'yes' | 'no' | 'unknown';
};

function getGeminiSpots(question: string, spots: RestSpot[], candidates: RestSpot[]): GeminiSpotPromptItem[] {
  if (isConditionQuestion(question)) {
    return [...spots]
      .map((spot) => {
        const condition = scoreSpotForQuestion(question, spot);
        return {
          ...spot,
          conditionScore: condition.score,
          matchedFeatures: condition.matchedFeatures,
          tableAvailability: condition.tableAvailability,
        };
      })
      .sort((a, b) => (b.conditionScore ?? 0) - (a.conditionScore ?? 0) || (b.seatCount ?? 0) - (a.seatCount ?? 0));
  }

  return (candidates.length > 0 ? candidates : spots).map((spot) => ({
    ...spot,
    conditionScore: 0,
    matchedFeatures: [],
    tableAvailability: inferTableAvailabilityFromText(spot),
  }));
}

function formatAnswer(candidates: RestSpot[]) {
  if (!candidates.length) {
    return { answer: FALLBACK_ANSWER, matchedSpotIds: [], found: false };
  }

  const first = candidates[0];
  const backrestStatus = first.backrestStatus ?? inferBackrestStatusFromTags(first.tags);
  const wheelchairAccessStatus = first.wheelchairAccessStatus ?? inferWheelchairAccessStatusFromTags(first.tags);

  const parts = [
    `${first.areaName}瑜?李얠븯?댁슂.`,
    first.description,
    first.seatCount ? `醫뚯꽍? ${first.seatCount}?앹엯?덈떎.` : null,
    `?깅컺?대뒗 ${formatBackrestStatus(backrestStatus)}.`,
    `?좎껜???묎렐?깆? ${formatWheelchairAccessStatus(wheelchairAccessStatus)}.`,
    first.hasOutlet ? '肄섏꽱?멸? ?덉뼱??' : null,
    first.isQuiet ? '議곗슜???몄씠?먯슂.' : null,
    first.tags.length ? `?쒓렇: ${first.tags.join(', ')}` : null,
  ].filter(Boolean);

  return {
    answer: parts.join(' '),
    matchedSpotIds: candidates.map((spot) => spot.id),
    found: true,
  };
}

function buildLocalConditionAnswer(question: string, spots: GeminiSpotPromptItem[]) {
  const sorted = spots.filter((spot) => (spot.conditionScore ?? 0) > 0);
  if (!sorted.length) return null;

  const topSpots = sorted.slice(0, 3);
  const conditionKeywords = getConditionKeywords(question);
  const conditionLabel = conditionKeywords.length ? conditionKeywords.join(', ') : '조건';
  const primary = topSpots[0];
  const summary = topSpots
    .map((spot, index) => {
      const featureText = spot.matchedFeatures?.length ? spot.matchedFeatures.join(', ') : '가까운 조건';
      return index === 0
        ? `${spot.areaName}(${spot.building} ${spot.floor})는 ${featureText} 조건을 가장 많이 만족해요.`
        : `${spot.areaName}(${spot.building} ${spot.floor})도 함께 볼 만해요.`;
    })
    .join(' ');

  return {
    answer: `정확히 일치하는 곳이 없더라도, ${conditionLabel} 조건과 가장 가까운 곳으로 ${primary.areaName}(${primary.building} ${primary.floor})를 먼저 추천드려요. ${summary}`,
    matchedSpotIds: topSpots.map((spot) => spot.id),
    found: true,
    fallbackUsed: true,
  };
}

function buildAnswer(conditions: SearchConditions, results: NormalizedPlace[]) {
  const conditionText = describeConditions(conditions);
  if (!results.length) {
    return conditionText === '등록된 휴식공간'
      ? '현재 등록된 휴식공간은 없습니다.'
      : `${conditionText}와(과) 일치하는 휴식공간은 현재 등록된 데이터에 없습니다.`;
  }

  const intro =
    conditionText === '등록된 휴식공간'
      ? `등록된 휴식공간은 총 ${results.length}곳입니다.`
      : `${conditionText} 휴식공간은 총 ${results.length}곳입니다.`;
  const lines = results.map((place, index) => {
    const facts = buildPlaceFacts(place);
    const factText = facts.length ? ` (${facts.join(', ')})` : ' (정보 없음)';
    return `${index + 1}. ${place.name} - ${place.building} ${place.floor}${factText}`;
  });

  return [intro, ...lines].join('\n');
}

function buildSmartAnswer(conditions: SearchConditions, results: NormalizedPlace[]) {
  const conditionText = describeConditions(conditions);

  if (!results.length) {
    return `요청하신 조건(${conditionText})을 모두 충족하는 휴식 공간은 현재 등록되어 있지 않습니다.`;
  }

  const intro =
    conditionText === '등록된 휴식공간'
      ? `등록된 휴식공간은 총 ${results.length}곳입니다.`
      : `${conditionText}을(를) 모두 갖춘 휴식 공간은 총 ${results.length}곳입니다.`;
  const lines = results.map((place, index) => {
    const facts = buildPlaceFacts(place);
    const factText = facts.length ? ` (${facts.join(', ')})` : ' (정보 없음)';
    return `${index + 1}. ${place.name} - ${place.building} ${place.floor}${factText}`;
  });

  return [intro, ...lines].join('\n');
}

function buildDeterministicChatResponse(question: string, spots: RestSpot[]) {
  const normalizedPlaces = spots
    .map(normalizePlace)
    .filter((place): place is NormalizedPlace => Boolean(place))
    .filter(validatePlace);

  const uniquePlaces = new Map<string, NormalizedPlace>();
  for (const place of normalizedPlaces) {
    if (uniquePlaces.has(place.id)) {
      console.warn('[api/chat] duplicate place id detected', { placeId: place.id });
    }
    uniquePlaces.set(place.id, place);
  }

  const validPlaces = Array.from(uniquePlaces.values()).sort(deterministicPlaceSort);
  const placesVersion = getPlacesVersion(validPlaces);
  const conditions = extractConditions(question);
  const cacheKey = JSON.stringify({ conditions, placesVersion });
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const hasConditions = Object.values(conditions).some((value) => value !== null);
  const exactResults = hasConditions ? validPlaces.filter((place) => matchesConditions(place, conditions)) : validPlaces;
  const sortedResults = [...exactResults].sort(deterministicPlaceSort);
  const response: SearchResponse = {
    answer: buildSmartAnswer(conditions, sortedResults),
    matchedSpotIds: sortedResults.map((place) => place.id),
    found: sortedResults.length > 0,
    places: sortedResults.map((place) => ({
      id: place.id,
      building: place.building,
      floor: place.floor,
      name: place.name,
      description: place.description,
      seatCount: place.seatCount,
      outletAvailable: place.outletAvailable,
      tableAvailable: place.tableAvailable,
      quiet: place.quiet,
      backrestAvailable: place.backrestAvailable,
      wheelchairAccessible: place.wheelchairAccessible,
      wheelchairParkingAvailable: place.wheelchairParkingAvailable,
      x: place.x,
      y: place.y,
      facts: buildPlaceFacts(place),
    })),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Chat Search]', {
      originalMessage: question,
      normalizedMessage: normalizeTextQuestion(question),
      extractedConditions: conditions,
      totalPlaces: validPlaces.length,
      matchedPlaceIds: sortedResults.map((place) => place.id),
      matchedPlaceNames: sortedResults.map((place) => place.name),
    });
  }

  responseCache.set(cacheKey, response);
  return response;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiRequestBody(systemPrompt: string, question: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text: systemPrompt,
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: question,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  };
}

async function callGeminiWithRetry({
  apiKey,
  model,
  systemPrompt,
  question,
  maxRetries = 3,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  question: string;
  maxRetries?: number;
}): Promise<GeminiCallResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let lastStatus: number | null = null;
  let lastStatusText = '';
  let lastBody = '';

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getGeminiRequestBody(systemPrompt, question)),
    });

    const rawResponseText = await response.text();

    if (response.ok) {
      return {
        ok: true,
        model,
        endpoint,
        rawResponseText,
      };
    }

    lastStatus = response.status;
    lastStatusText = response.statusText;
    lastBody = rawResponseText;

    console.warn('[api/chat] Gemini API retryable error', {
      model,
      endpoint,
      attempt,
      maxRetries,
      status: response.status,
      statusText: response.statusText,
      body: rawResponseText,
    });

    if (response.status !== 429 && response.status !== 503) {
      break;
    }

    if (attempt < maxRetries) {
      const delay = 250 * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  return {
    ok: false,
    model,
    endpoint,
    status: lastStatus,
    statusText: lastStatusText,
    body: lastBody,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const question = typeof body?.question === 'string' ? body.question : '';
    if (!question.trim()) {
      return NextResponse.json({ error: '吏덈Ц???낅젰??二쇱꽭??' }, { status: 400 });
    }

    const spots = await readRestSpots();
    const response = buildDeterministicChatResponse(question, spots);
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[api/chat] unexpected error', error);
    return NextResponse.json({ error: '吏덈Ц??泥섎━?섎뒗 以?臾몄젣媛 ?앷꼈?댁슂.' }, { status: 500 });
  }
}
