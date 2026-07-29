import { NextResponse } from 'next/server';
import { readRestSpots } from '@/lib/rest-spot-store';
import { RestSpot } from '@/types/chair';

export const runtime = 'nodejs';

const FALLBACK_ANSWER = '아직 그 위치의 휴식 공간 정보는 등록되어 있지 않아요.';

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function buildSearchTerms(spot: RestSpot) {
  return [spot.building, spot.floor, spot.areaName, spot.description, ...spot.tags].map(normalize);
}

function extractCandidates(question: string, spots: RestSpot[]) {
  const normalizedQuestion = normalize(question);
  const buildingMatch = spots.find((spot) => normalizedQuestion.includes(normalize(spot.building)))?.building ?? '';
  const floorMatch = spots.find((spot) => normalizedQuestion.includes(normalize(spot.floor)))?.floor ?? '';

  return spots.filter((spot) => {
    const terms = buildSearchTerms(spot);
    const buildingOk = !buildingMatch || spot.building === buildingMatch;
    const floorOk = !floorMatch || spot.floor === floorMatch;
    const textOk = terms.some((term) => normalizedQuestion.includes(term));
    return buildingOk && floorOk && (textOk || Boolean(buildingMatch || floorMatch));
  });
}

function formatAnswer(candidates: RestSpot[]) {
  if (!candidates.length) {
    return { answer: FALLBACK_ANSWER, matchedSpotIds: [], found: false };
  }

  const first = candidates[0];
  const parts = [
    `${first.areaName}을(를) 찾았어요.`,
    first.description,
    first.seatCount ? `좌석은 ${first.seatCount}개입니다.` : null,
    first.hasOutlet ? '콘센트가 있어요.' : null,
    first.isQuiet ? '조용한 편이에요.' : null,
    first.tags.length ? `태그: ${first.tags.join(', ')}` : null,
  ].filter(Boolean);

  return {
    answer: parts.join(' '),
    matchedSpotIds: candidates.map((spot) => spot.id),
    found: true,
  };
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    const spots = await readRestSpots();
    const candidates = extractCandidates(question, spots);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(formatAnswer(candidates));
    }

    const prompt = [
      '너는 삼성서울병원 휴식공간 안내 도우미야.',
      '반드시 아래 후보 데이터만 사용해서 대답해.',
      'JSON 형식으로 answer, matchedSpotIds, found를 반환해.',
      JSON.stringify(candidates, null, 2),
    ].join('\n\n');

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: '챗봇 연결에 잠시 문제가 생겼어요.' }, { status: 502 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: '챗봇 응답을 받을 수 없었어요.' }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    const allowedIds = new Set(candidates.map((spot) => spot.id));
    const matchedSpotIds = Array.isArray(parsed.matchedSpotIds)
      ? parsed.matchedSpotIds.filter((id: unknown) => typeof id === 'string' && allowedIds.has(id))
      : [];

    return NextResponse.json({
      answer: String(parsed.answer || FALLBACK_ANSWER),
      matchedSpotIds,
      found: matchedSpotIds.length > 0 && parsed.found !== false,
    });
  } catch {
    return NextResponse.json({ error: '질문을 처리하는 중 문제가 생겼어요.' }, { status: 500 });
  }
}
