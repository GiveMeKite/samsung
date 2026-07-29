'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Layers3, MapPin, ShieldAlert } from 'lucide-react';
import type { SmcMain1fPoisFile, SmcMain1fPoi, SmcMain1fRestSpot } from '@/types/smc-poi';

type MarkerItem = SmcMain1fPoi | SmcMain1fRestSpot;

const CATEGORY_META: Record<SmcMain1fPoi['categoryColor'], { label: string; color: string; ring: string }> = {
  clinic: { label: '진료', color: '#2277aa', ring: 'rgba(34, 119, 170, 0.18)' },
  exam: { label: '검사', color: '#0e99b5', ring: 'rgba(14, 153, 181, 0.18)' },
  service: { label: '서비스', color: '#5d8c38', ring: 'rgba(93, 140, 56, 0.18)' },
  convenience: { label: '편의', color: '#d58b22', ring: 'rgba(213, 139, 34, 0.18)' },
  entrance: { label: '출입구', color: '#e34f3f', ring: 'rgba(227, 79, 63, 0.18)' },
  transport: { label: '이동', color: '#69717a', ring: 'rgba(105, 113, 122, 0.18)' },
  connection: { label: '연결', color: '#8d62b8', ring: 'rgba(141, 98, 184, 0.18)' },
  facility: { label: '시설', color: '#6f7f8c', ring: 'rgba(111, 127, 140, 0.18)' },
  pharmacy: { label: '약국', color: '#26966f', ring: 'rgba(38, 150, 111, 0.18)' },
  ward: { label: '병동', color: '#9b6a44', ring: 'rgba(155, 106, 68, 0.18)' },
  emergency: { label: '응급', color: '#d93636', ring: 'rgba(217, 54, 54, 0.18)' },
  medical: { label: '의료', color: '#b64b5f', ring: 'rgba(182, 75, 95, 0.18)' },
  amenity: { label: '편의', color: '#8b6f2f', ring: 'rgba(139, 111, 47, 0.18)' },
  rest: { label: '휴식 공간', color: '#ca8a04', ring: 'rgba(202, 138, 4, 0.22)' },
  other: { label: '기타', color: '#475569', ring: 'rgba(71, 85, 105, 0.18)' },
};

function hasCoordinates(item: MarkerItem): item is MarkerItem & { x: number; y: number } {
  return typeof item.x === 'number' && typeof item.y === 'number';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positionToPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function MarkerGlyph({
  item,
  active,
  onActivate,
  isAlternate = false,
}: {
  item: MarkerItem & { x: number; y: number };
  active: boolean;
  onActivate: () => void;
  isAlternate?: boolean;
}) {
  const meta = CATEGORY_META[item.categoryColor] ?? CATEGORY_META.other;
  const size = active ? 18 : item.categoryColor === 'rest' ? 16 : 14;

  return (
    <g
      role="button"
      tabIndex={0}
      transform={`translate(${item.x} ${item.y})`}
      className="cursor-pointer outline-none"
      aria-label={`${item.name} 상세보기`}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <circle r={size / 2 + 8} fill={meta.ring} opacity={active ? 1 : 0.65} />
      <circle
        r={size / 2}
        fill={meta.color}
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeDasharray={isAlternate ? '4 2' : undefined}
      />
      {item.categoryColor === 'rest' && (
        <path d="M-4 0H4M0 -4V4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      )}
      <title>{item.name}</title>
    </g>
  );
}

function MapBackdrop({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect width={width} height={height} fill="#f5f7f8" />
      <path
        d="M175 0H945V420H904V624H322V701H175V522L106 407L175 346V0Z"
        fill="#eef7fb"
        stroke="#09c"
        strokeWidth="5"
      />
      <rect x="325" y="140" width="128" height="126" fill="#d9dde0" stroke="#b7bec4" strokeWidth="2" />
      <rect x="560" y="70" width="150" height="246" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
      <rect x="724" y="66" width="92" height="294" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
      <rect x="842" y="70" width="103" height="294" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
      <rect x="320" y="532" width="310" height="94" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
      <rect x="630" y="456" width="68" height="72" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
      <rect x="704" y="466" width="241" height="158" fill="#dbeef8" stroke="#b8d3df" strokeWidth="2" />
    </svg>
  );
}

export default function SmcMain1fSvgMap({
  mapData,
  restSpots = [],
  initialHighlightedId = null,
}: {
  mapData: SmcMain1fPoisFile;
  restSpots?: SmcMain1fRestSpot[];
  initialHighlightedId?: string | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(initialHighlightedId);
  const width = mapData.coordinateSystem.width;
  const height = mapData.coordinateSystem.height;

  const combinedItems = useMemo(() => [...mapData.pois, ...restSpots], [mapData.pois, restSpots]);
  const renderableItems = combinedItems.filter(hasCoordinates);
  const unmappedItems = combinedItems.filter((item) => !hasCoordinates(item));
  const activeItem = renderableItems.find((item) => item.id === activeId) ?? null;

  const legendItems = useMemo(() => {
    const present = Array.from(new Set(combinedItems.map((item) => item.categoryColor)));
    const order: SmcMain1fPoi['categoryColor'][] = [
      'clinic',
      'exam',
      'service',
      'convenience',
      'entrance',
      'transport',
      'connection',
      'facility',
      'pharmacy',
      'ward',
      'emergency',
      'medical',
      'amenity',
      'rest',
      'other',
    ];
    return order.filter((key) => present.includes(key)).map((key) => ({ key, ...CATEGORY_META[key] }));
  }, [combinedItems]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#0d9c9a]">SMC MAIN 1F POI MAP</p>
            <h1 className="mt-1 text-2xl font-black text-[#18324a]">삼성서울병원 본관 1층 POI 지도</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              출처: {mapData.sourceUrl}
            </p>
          </div>
          <div className="rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <Layers3 size={14} className="mr-1 inline-block" />
            {width} x {height} 좌표계
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#f7fbff_0%,#edf5f7_100%)]"
          onClick={() => setActiveId(null)}
        >
          <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
            <MapBackdrop width={width} height={height} />

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {renderableItems.map((item) => (
                <g key={item.id}>
                  <MarkerGlyph
                    item={item}
                    active={activeId === item.id}
                    onActivate={() => setActiveId((current) => (current === item.id ? null : item.id))}
                  />
                  {item.alternatePositions?.map((position, index) => {
                    if (typeof position.x !== 'number' || typeof position.y !== 'number') return null;
                    return (
                      <MarkerGlyph
                        key={`${item.id}-alt-${index}`}
                        item={{ ...item, x: position.x, y: position.y }}
                        active={activeId === item.id}
                        isAlternate
                        onActivate={() => setActiveId((current) => (current === item.id ? null : item.id))}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>

            {activeItem && hasCoordinates(activeItem) && (
              <div
                className="pointer-events-none absolute z-30 min-w-[210px] max-w-[300px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
                style={{
                  left: positionToPercent(clamp(activeItem.x, 0, width), width),
                  top: positionToPercent(clamp(activeItem.y, 0, height), height),
                  transform: `translate(${clamp(activeItem.x, 0, width) > width * 0.72 ? '-100%' : '-50%'}, ${
                    clamp(activeItem.y, 0, height) < height * 0.22 ? '18px' : '-100%'
                  })`,
                  marginTop: clamp(activeItem.y, 0, height) < height * 0.22 ? '10px' : 0,
                }}
              >
                <span
                  className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: `${(CATEGORY_META[activeItem.categoryColor] ?? CATEGORY_META.other).color}15`,
                    color: (CATEGORY_META[activeItem.categoryColor] ?? CATEGORY_META.other).color,
                  }}
                >
                  <MapPin size={11} />
                  {(CATEGORY_META[activeItem.categoryColor] ?? CATEGORY_META.other).label}
                </span>
                <strong className="block text-sm text-[#18324a]">{activeItem.name}</strong>
                {activeItem.description && <p className="mt-1 text-xs leading-5 text-slate-500">{activeItem.description}</p>}
                {typeof activeItem.deptNo === 'number' && (
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">부서번호 {activeItem.deptNo}</p>
                )}
                {activeItem.alternatePositions?.length ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    보조 위치 {activeItem.alternatePositions.length}개
                  </p>
                ) : null}
                {activeItem.nearbyPoiIds?.length ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    인접 시설 {activeItem.nearbyPoiIds.length}개
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {legendItems.map((entry) => (
            <div
              key={entry.key}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#1668c7]" />
            <h2 className="text-base font-black">위치 미확정 시설</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            x, y가 없는 항목은 지도에서 제외하고 여기서 따로 노출합니다. 나중에 좌표만 채우면 즉시 지도에 올라갑니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {unmappedItems.length > 0 ? (
              unmappedItems.map((item) => {
                const meta = CATEGORY_META[item.categoryColor] ?? CATEGORY_META.other;
                return (
                  <div key={item.id} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-sm text-[#18324a]">{item.name}</strong>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description ?? '좌표 미설정'}</p>
                      </div>
                      <span className="mt-0.5 rounded-full px-2 py-1 text-[11px] font-bold" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                        미확정
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">좌표 미확정 시설이 없습니다.</div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-[#0d9c9a]" />
              <h2 className="text-base font-black">사용 팁</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>• SVG viewBox는 945 x 701을 그대로 사용합니다.</li>
              <li>• 마커를 누르거나 포커스하면 이름과 부가 정보가 표시됩니다.</li>
              <li>• 보조 위치는 같은 시설의 secondary marker로 함께 렌더링됩니다.</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black">원본 메타</h2>
              <a
                href={mapData.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                원문 보기 <ExternalLink size={12} />
              </a>
            </div>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-start justify-between gap-3">
                <dt className="font-semibold text-slate-500">출처 이미지 경로</dt>
                <dd className="text-right text-xs">{mapData.mapImagePathFromSource}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="font-semibold text-slate-500">건물/층</dt>
                <dd>{mapData.building} {mapData.floor}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {restSpots.length > 0 && (
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
          <h2 className="text-base font-black">휴식 공간 레이어</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            rest 카테고리는 같은 좌표계로 얹어서 나중에 의자/휴게공간 핀을 표시할 때 그대로 재사용할 수 있습니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {restSpots.map((spot) => (
              <div key={spot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-[#18324a]">{spot.name}</strong>
                  <span className="rounded-full px-2 py-1 text-[11px] font-bold text-[#ca8a04] ring-1 ring-[#fde68a]" style={{ backgroundColor: '#fff8db' }}>
                    rest
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{spot.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {spot.tags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
