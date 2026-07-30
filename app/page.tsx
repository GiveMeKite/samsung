'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Compass, MapPinned, ShieldCheck } from 'lucide-react';
import initialChairs from '@/data/rest-spots.json';
import { Chair, restSpotToChair, RestSpot } from '@/types/chair';
import Header from '@/components/Header';
import ChairImage from '@/components/ChairImage';
import MapView from '@/components/MapView';
import ChairList from '@/components/ChairList';
import { normalizeHospitalFloor } from '@/lib/hospital-maps';

function normalizePublicChairs(spots: RestSpot[]) {
  return spots.map(restSpotToChair);
}

export default function Page() {
  const [page, setPage] = useState('map');
  const [selected, setSelected] = useState<Chair | null>(null);
  const [building, setBuilding] = useState('본관');
  const [floor, setFloor] = useState('1층');
  const [chairs, setChairs] = useState<Chair[]>(normalizePublicChairs(initialChairs as RestSpot[]));
  const normalizedBuilding = building.trim();
  const normalizedFloor = normalizedBuilding === '본관' ? normalizeHospitalFloor(floor) : floor.trim();

  async function refreshChairs() {
    try {
      const response = await fetch('/api/spots', { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) return;

      const nextChairs = Array.isArray(data?.chairs) ? (data.chairs as Chair[]) : [];
      setChairs(nextChairs);
    } catch {
      // Keep the static fallback if the API is temporarily unavailable.
    }
  }

  useEffect(() => {
    void refreshChairs();

    const onFocus = () => {
      void refreshChairs();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshChairs();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (page === 'map' || page === 'list') {
      void refreshChairs();
    }
  }, [page]);

  const openMap = (chair: Chair) => {
    setBuilding(chair.building);
    setFloor(chair.floor);
    setSelected(chair);
    setPage('map');
  };

  const visibleMapChairs = chairs.filter(
    (chair) =>
      chair.building === normalizedBuilding &&
      (normalizedBuilding === '본관' ? normalizeHospitalFloor(chair.floor) : chair.floor.trim()) === normalizedFloor,
  );

  return (
    <>
      <Header
        active={page}
        onNavigate={(nextPage) => {
          setPage(nextPage === 'home' ? 'map' : nextPage);
          if (nextPage !== 'map') {
            setSelected(null);
          }
        }}
      />
      {page === 'home' && <Home chairs={chairs} onNavigate={setPage} onOpenMap={openMap} />}
      {page === 'map' && (
        <MapView
          key={`${normalizedBuilding}-${normalizedFloor}`}
          chairs={visibleMapChairs}
          selected={selected}
          onSelect={setSelected}
          building={normalizedBuilding}
          floor={normalizedFloor}
          setBuilding={setBuilding}
          setFloor={setFloor}
        />
      )}
      {page === 'list' && <ChairList chairs={chairs} onOpenMap={openMap} />}
      {page === 'about' && <About />}
      {page !== 'home' && <Footer />}
    </>
  );
}

function Home({
  chairs,
  onNavigate,
  onOpenMap,
}: {
  chairs: Chair[];
  onNavigate: (p: string) => void;
  onOpenMap: (c: Chair) => void;
}) {
  const featured = chairs[0] ?? null;

  return (
    <main>
      <section className="container grid gap-10 py-14 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-24">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-extrabold text-teal-700">
            <Compass size={15} /> 병원 휴식 공간 지도
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.18] tracking-tight md:text-6xl">
            병원에서
            <span className="text-[#1668c7]">숨은 휴식 공간</span>을
            <br />
            찾아보세요
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
            조용한 의자, 콘센트가 있는 자리, 쉬어가기 좋은 공간을 건물과 층별로 빠르게 확인할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('map')}
              className="flex items-center gap-2 rounded-xl bg-[#1668c7] px-5 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200"
            >
              지도에서 찾기 <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('list')}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-extrabold text-slate-700"
            >
              전체 의자 보기
            </button>
          </div>
          <div className="mt-8 flex gap-5 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-teal-600" />
              직접 확인한 정보
            </span>
            <span className="flex items-center gap-2">
              <MapPinned size={17} className="text-teal-600" />
              지도 기반 안내
            </span>
          </div>
        </div>
        {featured ? (
          <button onClick={() => onOpenMap(featured)} className="soft-card group overflow-hidden text-left">
            <ChairImage src={featured.image} alt="대표 휴식 공간 사진" className="h-72 w-full md:h-[390px]" />
            <div className="p-5">
              <div className="mb-2 text-xs font-bold text-[#0d9c9a]">오늘의 추천 휴식 공간</div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">{featured.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {featured.building} · {featured.floor}
                  </p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-[#1668c7] transition group-hover:translate-x-1">
                  <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </button>
        ) : null}
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="container grid gap-6 py-10 sm:grid-cols-3">
          <Info icon={<MapPinned />} title="건물·층별 검색" text="원하는 건물과 층에서 휴식 공간을 바로 찾아보세요." />
          <Info icon={<ShieldCheck />} title="편의 정보 확인" text="좌석 수, 콘센트, 조용함 여부를 함께 볼 수 있습니다." />
          <Info icon={<Compass />} title="빠른 동선 안내" text="지도와 목록을 오가며 가장 쉬운 경로로 찾을 수 있습니다." />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <div className="text-[#1668c7]">{icon}</div>
      <div>
        <h3 className="font-extrabold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function About() {
  return (
    <main className="container py-14">
      <div className="soft-card max-w-3xl p-7 md:p-12">
        <p className="mb-3 text-sm font-bold text-[#0d9c9a]">ABOUT THIS PROJECT</p>
        <h1 className="text-3xl font-extrabold">프로젝트 소개</h1>
        <p className="mt-6 leading-8 text-slate-600">
          삼성서울병원 내 휴식 공간을 건물과 층별로 정리해, 필요한 공간을 빠르게 찾을 수 있도록 돕는 안내 웹사이트입니다.
        </p>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-7 text-xs leading-6 text-slate-500">
        <strong className="text-slate-700">숨은 의자 찾기</strong>
        <br />
        실제 위치 정보는 운영자가 직접 확인한 데이터만 반영합니다.
      </div>
    </footer>
  );
}
