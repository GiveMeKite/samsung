'use client';

import { Minus, Plus, Map as MapIcon, Navigation } from 'lucide-react';
import SmcMain1fSvgMap from '@/components/SmcMain1fSvgMap';
import { Chair } from '@/types/chair';
import poiData from '@/data/smc-main-1f-pois.json';
import main1fRestSpots from '@/data/smc-main-1f-rest-spots.json';
import type { SmcMain1fPoisFile, SmcMain1fRestSpot } from '@/types/smc-poi';
import ChairDetail from './ChairDetail';

const mapPaths: Record<string, string> = {
  '본관-2층': '/maps/main-2f.svg',
  '별관-1층': '/maps/annex-1f.svg',
  '암병원-1층': '/maps/cancer-1f.svg',
  '양성자치료센터-1층': '/maps/proton-1f.svg',
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
  const floors = building === '본관' ? ['1층', '2층'] : ['1층'];
  const mapSrc = mapPaths[`${building}-${floor}`];
  const showMain1fMap = building === '본관' && floor === '1층';

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
            onClick={() => {
              setBuilding(nextBuilding);
              setFloor('1층');
              onSelect(null);
            }}
            className={`rounded-full border px-4 py-2.5 text-sm font-bold ${
              building === nextBuilding ? 'border-blue-600 bg-[#1668c7] text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {nextBuilding}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2">
        {floors.map((nextFloor) => (
          <button
            key={nextFloor}
            onClick={() => {
              setFloor(nextFloor);
              onSelect(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              floor === nextFloor ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {nextFloor}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="soft-card relative overflow-hidden p-3">
          {showMain1fMap ? (
            <div className="max-h-[80vh] overflow-auto rounded-xl border border-slate-200 bg-[#edf4f5]">
              <SmcMain1fSvgMap
                mapData={poiData as SmcMain1fPoisFile}
                restSpots={main1fRestSpots as SmcMain1fRestSpot[]}
              />
            </div>
          ) : (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-[#edf4f5]">
              {mapSrc ? (
                <img
                  src={mapSrc}
                  alt={`${building} ${floor} 약도`}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}

              <div className="absolute inset-0 grid place-items-center p-5 text-center text-slate-500">
                <div>
                  <MapIcon size={38} className="mx-auto mb-3 text-[#8abcc2]" />
                  <strong className="block">
                    {building} {floor} 약도
                  </strong>
                  <span className="mt-1 block text-xs">지도 이미지가 준비되면 이 영역에 표시됩니다.</span>
                </div>
              </div>

              {chairs.map((chair) => (
                <button
                  key={chair.id}
                  type="button"
                  onClick={() => onSelect(chair)}
                  aria-label={`${chair.name} 위치 보기`}
                  style={{ left: `${chair.x}%`, top: `${chair.y}%` }}
                  className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#0d9c9a] shadow-lg transition hover:scale-125 focus:scale-125 focus:outline focus:outline-2 focus:outline-blue-700 ${
                    selected?.id === chair.id ? 'z-10 h-11 w-11 border-[#18324a] bg-[#1668c7]' : ''
                  }`}
                >
                  <span className="sr-only">{chair.name}</span>
                </button>
              ))}
            </div>
          )}

          {!showMain1fMap && (
            <div className="absolute bottom-7 right-7 flex flex-col overflow-hidden rounded-lg bg-white shadow">
              <button className="grid h-10 w-10 place-items-center border-b text-slate-600" aria-label="지도 확대" type="button">
                <Plus size={18} />
              </button>
              <button className="grid h-10 w-10 place-items-center text-slate-600" aria-label="지도 축소" type="button">
                <Minus size={18} />
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 px-1 text-xs text-slate-500">
            <Navigation size={14} className="text-[#0d9c9a]" />
            마커를 선택하면 상세 정보가 나타납니다.
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          {selected ? (
            <ChairDetail chair={selected} onClose={() => onSelect(null)} />
          ) : (
            <div className="soft-card flex min-h-[280px] flex-col items-center justify-center p-7 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-[#1668c7]">
                <MapIcon />
              </div>
              <h2 className="font-extrabold">의자를 선택해 주세요</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                지도 위 원형 마커를 누르면
                <br />
                의자 사진과 편의 정보를 볼 수 있어요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
