import SmcMain1fSvgMap from '@/components/SmcMain1fSvgMap';
import poiData from '@/data/smc-main-1f-pois.json';
import restSpots from '@/data/smc-main-1f-rest-spots.json';
import type { SmcMain1fPoisFile, SmcMain1fRestSpot } from '@/types/smc-poi';

type PageProps = {
  searchParams?: { highlight?: string };
};

export default function Main1fMapPage({ searchParams }: PageProps) {
  const highlightId = typeof searchParams?.highlight === 'string' ? searchParams.highlight : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef7ff,_#f7fbfd_45%,_#eef4f7_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_60px_rgba(24,50,74,0.08)] backdrop-blur">
          <p className="text-xs font-bold tracking-[0.22em] text-[#0d9c9a]">SMC POI MAP</p>
          <h1 className="mt-2 text-3xl font-black text-[#18324a] md:text-4xl">삼성서울병원 본관 1층 약도</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            POI 좌표와 휴식 공간 핀을 같은 0~512 좌표계 위에서 함께 관리하는 초기 통합 페이지입니다.
          </p>
        </section>

        <SmcMain1fSvgMap
          mapData={poiData as SmcMain1fPoisFile}
          restSpots={restSpots as SmcMain1fRestSpot[]}
          initialHighlightedId={highlightId}
        />
      </div>
    </main>
  );
}
