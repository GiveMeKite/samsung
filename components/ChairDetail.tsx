'use client';

import { Accessibility, Armchair, Cable, MapPin, Plug, Volume2, X } from 'lucide-react';
import { Chair, formatBackrestStatus, formatWheelchairAccessStatus } from '@/types/chair';
import ChairImage from './ChairImage';

export default function ChairDetail({ chair, onClose }: { chair: Chair; onClose: () => void }) {
  const items = [
    ['좌석 수', `${chair.seatCount}석`, Armchair],
    ['등받이', formatBackrestStatus(chair.backrestStatus), Accessibility],
    ['콘센트', chair.hasOutlet ? '있음' : '없음', Plug],
    ['휠체어 접근성', formatWheelchairAccessStatus(chair.wheelchairAccessStatus), Accessibility],
    ['조용한 공간', chair.isQuiet ? '예' : '아니오', Volume2],
  ] as const;

  return (
    <aside className="soft-card w-full min-w-0 max-w-full overflow-hidden" aria-label="휴식 공간 상세 정보">
      <div className="relative">
        <ChairImage src={chair.image} alt={`${chair.name} 사진`} className="w-full" fit="natural" />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow"
          aria-label="상세 정보 닫기"
        >
          <X size={19} />
        </button>
      </div>

      <div className="min-w-0 p-5">
        <div className="mb-4 min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#0d9c9a]">
            <MapPin size={14} />
            {chair.building} · {chair.floor}
          </div>
          <h2 className="text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.3] break-words [overflow-wrap:anywhere]">
            {chair.name}
          </h2>
          <p className="mt-2 text-[clamp(15px,1.6vw,20px)] leading-7 text-slate-600 break-words [overflow-wrap:anywhere]">
            {chair.location}
          </p>
        </div>

        <p className="mb-5 border-l-2 border-teal-400 pl-3 text-[clamp(15px,1.6vw,18px)] leading-7 text-slate-600 break-words [overflow-wrap:anywhere]">
          {chair.description}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(([label, value, Icon]) => (
            <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
              <Icon size={17} className="mb-2 text-[#1668c7]" />
              <span className="block text-xs text-slate-500">{label}</span>
              <strong className="block text-sm break-words [overflow-wrap:anywhere]">{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
