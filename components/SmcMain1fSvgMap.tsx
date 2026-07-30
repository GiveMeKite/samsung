'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Layers3, MapPin, ShieldAlert } from 'lucide-react';
import type { SmcMain1fPoi, SmcMain1fPoisFile, SmcMain1fRestSpot } from '@/types/smc-poi';
import { MAIN_1F_MAP_SRC } from '@/lib/map-image';

type MarkerItem = SmcMain1fRestSpot;

const CATEGORY_META: Record<SmcMain1fPoi['categoryColor'], { label: string; color: string; ring: string }> = {
  clinic: { label: '진료', color: '#2277aa', ring: 'rgba(34, 119, 170, 0.16)' },
  exam: { label: '검사', color: '#0e99b5', ring: 'rgba(14, 153, 181, 0.16)' },
  service: { label: '서비스', color: '#5d8c38', ring: 'rgba(93, 140, 56, 0.16)' },
  convenience: { label: '편의', color: '#d58b22', ring: 'rgba(213, 139, 34, 0.16)' },
  entrance: { label: '출입구', color: '#e34f3f', ring: 'rgba(227, 79, 63, 0.16)' },
  transport: { label: '이동', color: '#69717a', ring: 'rgba(105, 113, 122, 0.16)' },
  connection: { label: '연결', color: '#8d62b8', ring: 'rgba(141, 98, 184, 0.16)' },
  facility: { label: '시설', color: '#6f7f8c', ring: 'rgba(111, 127, 140, 0.16)' },
  pharmacy: { label: '약국', color: '#26966f', ring: 'rgba(38, 150, 111, 0.16)' },
  ward: { label: '병동', color: '#9b6a44', ring: 'rgba(155, 106, 68, 0.16)' },
  emergency: { label: '응급', color: '#d93636', ring: 'rgba(217, 54, 54, 0.16)' },
  medical: { label: '의료', color: '#b64b5f', ring: 'rgba(182, 75, 95, 0.16)' },
  amenity: { label: '편의', color: '#8b6f2f', ring: 'rgba(139, 111, 47, 0.16)' },
  rest: { label: '휴식 공간', color: '#ca8a04', ring: 'rgba(202, 138, 4, 0.22)' },
  other: { label: '기타', color: '#475569', ring: 'rgba(71, 85, 105, 0.16)' },
};

function hasCoordinates(item: MarkerItem): item is MarkerItem & { x: number; y: number } {
  return typeof item.x === 'number' && typeof item.y === 'number';
}

function coordinateToPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function MarkerButton({
  item,
  width,
  height,
  active,
  onActivate,
  alternate = false,
}: {
  item: MarkerItem & { x: number; y: number };
  width: number;
  height: number;
  active: boolean;
  onActivate: () => void;
  alternate?: boolean;
}) {
  const meta = CATEGORY_META[item.categoryColor] ?? CATEGORY_META.other;
  const size = active ? 18 : item.categoryColor === 'rest' ? 16 : 14;

  return (
    <button
      type="button"
      aria-label={`${item.name} 위치 보기`}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      style={{
        left: coordinateToPercent(item.x, width),
        top: coordinateToPercent(item.y, height),
      }}
      className="absolute -translate-x-1/2 -translate-y-full cursor-pointer rounded-full outline-none"
    >
      <span
        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size + 16,
          height: size + 16,
          backgroundColor: meta.ring,
        }}
      />
      <span
        className={`relative block rounded-full border-4 border-white shadow-lg transition ${
          alternate ? 'border-dashed' : ''
        } ${active ? 'scale-110' : 'hover:scale-110'}`}
        style={{
          width: size,
          height: size,
          backgroundColor: meta.color,
        }}
      />
      {item.categoryColor === 'rest' ? (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] text-[10px] font-black text-white">R</span>
      ) : null}
      <span className="sr-only">{item.name}</span>
    </button>
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
  const imageSrc = MAIN_1F_MAP_SRC;
  const items = useMemo(() => restSpots, [restSpots]);
  const renderableItems = items.filter(hasCoordinates);
  const unmappedItems = items.filter((item) => !hasCoordinates(item));
  const activeItem = renderableItems.find((item) => item.id === activeId) ?? null;
  const legendItems = useMemo(() => {
    const present = new Set(items.map((item) => item.categoryColor));
    const order = ['rest'] as const;

    return order.filter((key) => present.has(key)).map((key) => ({ key, ...CATEGORY_META[key] }));
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#0d9c9a]">SMC MAIN 1F MAP</p>
            <h1 className="mt-1 text-2xl font-black text-[#18324a]">삼성서울병원 본관 1층 약도</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              실제 업로드한 약도 이미지 위에 POI와 휴식 공간 핀을 0~512 기준 좌표로 겹쳐 보여줍니다.
            </p>
          </div>
          <div className="rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <Layers3 size={14} className="mr-1 inline-block" />
            {width} x {height} 좌표계
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,#f8fbfd_0%,#edf5f7_100%)]"
          onClick={() => setActiveId(null)}
        >
          <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
            <img
              src={imageSrc}
              alt="삼성서울병원 본관 1층 약도"
              className="absolute inset-0 h-full w-full object-contain"
            />

            <div className="absolute inset-0">
              {renderableItems.map((item) => (
                <MarkerButton
                  key={item.id}
                  item={item}
                  width={width}
                  height={height}
                  active={activeId === item.id}
                  onActivate={() => setActiveId((current) => (current === item.id ? null : item.id))}
                />
              ))}

              {activeItem && (
                <div
                  className="pointer-events-none absolute z-30 min-w-[210px] max-w-[300px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
                  style={{
                    left: coordinateToPercent(activeItem.x, width),
                    top: coordinateToPercent(activeItem.y, height),
                    transform:
                      activeItem.x > width * 0.72
                        ? 'translate(-100%, -110%)'
                        : activeItem.y < height * 0.22
                          ? 'translate(-50%, 18px)'
                          : 'translate(-50%, -110%)',
                    marginTop: activeItem.y < height * 0.22 ? '10px' : 0,
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
                  {activeItem.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{activeItem.description}</p> : null}
                  {typeof activeItem.deptNo === 'number' ? (
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">부서번호 {activeItem.deptNo}</p>
                  ) : null}
                  {activeItem.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeItem.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
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
            x, y가 없는 항목은 지도 위에는 표시하지 않고, 나중에 좌표를 채울 수 있도록 별도 목록에만 남깁니다.
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
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description ?? '설명 없음'}</p>
                      </div>
                      <span
                        className="mt-0.5 rounded-full px-2 py-1 text-[11px] font-bold"
                        style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
                      >
                        미확정
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">위치 미확정 시설이 없습니다.</div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-[#0d9c9a]" />
              <h2 className="text-base font-black">사용 안내</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>실제 업로드한 본관 1층 약도 이미지를 배경으로 사용합니다.</li>
              <li>POI는 좌표값을 기준으로 이미지 위에 그대로 겹쳐 표시됩니다.</li>
              <li>휴식 공간 항목은 `rest` 색상으로 따로 구분됩니다.</li>
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
                <dt className="font-semibold text-slate-500">원본 지도 경로</dt>
                <dd className="text-right text-xs">{mapData.mapImagePathFromSource}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="font-semibold text-slate-500">건물 / 층</dt>
                <dd>
                  {mapData.building} {mapData.floor}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
