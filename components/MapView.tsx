'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Map as MapIcon, MessageCircle, Navigation } from 'lucide-react';
import type { Chair } from '@/types/chair';
import ChairDetail from './ChairDetail';
import MapMarker from './MapMarker';
import RestChatbot from './RestChatbot';
import { normalizeHospitalFloor } from '@/lib/hospital-maps';
import { resolveMapImageSrc } from '@/lib/map-image';

const mapPaths: Record<string, string> = {
  '본관-1층': '/maps/smc-main-1f.png',
  '본관-2층': '/maps/smc-main-2f.png',
  '본관-지하1층': '/maps/smc-main-b1.png',
  '본관-지하2층': '/maps/smc-main-b2.png',
  '별관-1층': '/maps/annex-1f.svg',
  '암병원-1층': '/maps/cancer-1f.svg',
  '양성자치료센터-1층': '/maps/proton-1f.svg',
};

type FilterKey = 'charge' | 'table' | 'wheelchair';
type RightTab = 'info' | 'chatbot';

const FILTER_META: Record<FilterKey, { label: string }> = {
  charge: { label: '충전' },
  table: { label: '테이블' },
  wheelchair: { label: '휠체어 주차' },
};

export default function MapView({
  chairs,
  selected,
  onSelect,
  building,
  floor,
  setBuilding,
  setFloor,
}: {
  chairs: Chair[];
  selected: Chair | null;
  onSelect: (chair: Chair | null) => void;
  building: string;
  floor: string;
  setBuilding: (v: string) => void;
  setFloor: (v: string) => void;
}) {
  const normalizedBuilding = building.trim();
  const normalizedFloor = normalizedBuilding === '본관' ? normalizeHospitalFloor(floor) : floor.trim();
  const floors = normalizedBuilding === '본관' ? ['지하2층', '지하1층', '1층', '2층'] : ['1층'];
  const mapSrc = resolveMapImageSrc(mapPaths[`${normalizedBuilding}-${normalizedFloor}`] ?? null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<FilterKey, boolean>>({
    charge: false,
    table: false,
    wheelchair: false,
  });
  const [rightTab, setRightTab] = useState<RightTab>('chatbot');

  useEffect(() => {
    setMapLoadFailed(false);
  }, [normalizedBuilding, normalizedFloor, mapSrc]);

  useEffect(() => {
    if (selected) {
      setRightTab('info');
    }
  }, [selected?.id]);

  const visibleChairs = useMemo(() => {
    return chairs.filter((chair) => {
      const matchesBuilding = chair.building === normalizedBuilding;
      const matchesFloor = (normalizedBuilding === '본관' ? normalizeHospitalFloor(chair.floor) : chair.floor.trim()) === normalizedFloor;
      const matchesCharge = !activeFilters.charge || chair.hasOutlet;
      const matchesTable = !activeFilters.table || chair.hasTable;
      const matchesWheelchair = !activeFilters.wheelchair || chair.hasWheelchairParking;
      return matchesBuilding && matchesFloor && matchesCharge && matchesTable && matchesWheelchair;
    });
  }, [chairs, activeFilters, normalizedBuilding, normalizedFloor]);

  const hasMapImage = Boolean(mapSrc) && !mapLoadFailed;
  const showPlaceholder = !mapSrc || mapLoadFailed;
  const mapErrorText =
    normalizedBuilding === '본관' && normalizedFloor === '지하1층'
      ? '본관 지하1층 약도를 불러오지 못했습니다.'
      : `${normalizedBuilding} ${normalizedFloor} 약도를 불러오지 못했습니다.`;

  const openInfoTab = () => setRightTab('info');
  const openChatbotTab = () => setRightTab('chatbot');

  return (
    <div className="container py-8">
      <div className="mb-7">
        <p className="mb-2 text-sm font-bold text-[#0d9c9a]">FIND YOUR REST SPOT</p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">지도에서 의자 찾기</h1>
        <p className="mt-3 text-slate-600">건물과 층을 선택하고, 지도 위 마커를 눌러 자세한 정보를 확인하세요.</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {['본관', '별관', '암병원', '양성자치료센터'].map((nextBuilding) => (
          <button
            key={nextBuilding}
            type="button"
            onClick={() => {
              setBuilding(nextBuilding);
              setFloor('1층');
              onSelect(null);
            }}
            className={`rounded-full border px-4 py-2.5 text-sm font-bold ${
              normalizedBuilding === nextBuilding
                ? 'border-blue-600 bg-[#1668c7] text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {nextBuilding}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {floors.map((nextFloor) => (
          <button
            key={nextFloor}
            type="button"
            onClick={() => {
              setFloor(nextFloor);
              onSelect(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              normalizedFloor === nextFloor ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {nextFloor}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTER_META) as FilterKey[]).map((key) => {
          const active = activeFilters[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveFilters((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                active ? 'border-[#1668c7] bg-blue-50 text-[#1668c7]' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded border ${
                  active ? 'border-[#1668c7] bg-[#1668c7] text-white' : 'border-slate-300 bg-white text-transparent'
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              {FILTER_META[key].label}
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
        <div className="soft-card relative min-w-0 overflow-hidden p-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-[#edf4f5]">
            {mapSrc ? (
              <img
                src={mapSrc}
                alt={`${normalizedBuilding} ${normalizedFloor} 약도`}
                className="absolute inset-0 h-full w-full object-contain"
                onError={(event) => {
                  setMapLoadFailed(true);
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : null}

            {showPlaceholder ? (
              <div className="absolute inset-0 grid place-items-center p-5 text-center text-slate-500">
                <div>
                  <MapIcon size={38} className="mx-auto mb-3 text-[#8abcc2]" />
                  <strong className="block">
                    {normalizedBuilding} {normalizedFloor} 약도
                  </strong>
                  <span className="mt-1 block text-xs">지도 이미지가 준비되면 이 영역에 표시됩니다.</span>
                </div>
              </div>
            ) : null}

            {!hasMapImage ? (
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                {mapErrorText}
              </div>
            ) : null}

            <div className="absolute inset-0">
              {visibleChairs.map((chair) => (
                <MapMarker
                  key={chair.id}
                  chair={chair}
                  x={chair.x}
                  y={chair.y}
                  selected={selected?.id === chair.id}
                  onActivate={() => onSelect(chair)}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 px-1 text-xs text-slate-500">
            <Navigation size={14} className="text-[#0d9c9a]" />
            마커를 선택하면 상세 정보가 나타납니다.
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-white/70 bg-white p-3 shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
            <div className="flex items-center gap-2 rounded-[18px] bg-slate-50 p-1">
              <button
                type="button"
                onClick={openInfoTab}
                className={`flex-1 rounded-[14px] px-3 py-2.5 text-sm font-bold transition ${
                  rightTab === 'info' ? 'bg-white text-[#1668c7] shadow-sm' : 'text-slate-500'
                }`}
              >
                장소 정보
              </button>
              <button
                type="button"
                onClick={openChatbotTab}
                className={`flex-1 rounded-[14px] px-3 py-2.5 text-sm font-bold transition ${
                  rightTab === 'chatbot' ? 'bg-white text-[#1668c7] shadow-sm' : 'text-slate-500'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle size={15} />
                  챗봇
                </span>
              </button>
            </div>
          </div>

          <div className="min-w-0">
            {rightTab === 'info' ? (
              selected ? (
                <ChairDetail chair={selected} onClose={() => onSelect(null)} />
              ) : (
                <div className="soft-card flex min-h-[360px] flex-col items-center justify-center p-7 text-center">
                  <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-[#1668c7]">
                    <MapIcon />
                  </div>
                  <h2 className="font-extrabold">마커를 선택해 주세요</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    지도를 눌러 원하는 휴식 공간을 고르면
                    <br />
                    상세 정보가 이 영역에 표시됩니다.
                  </p>
                </div>
              )
            ) : (
              <RestChatbot
                chairs={chairs}
                onOpenMap={(chair) => {
                  onSelect(chair);
                  setRightTab('info');
                }}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
