'use client';

import { Menu, Search, Shield } from 'lucide-react';

export default function Header({ active, onNavigate }: { active: string; onNavigate: (page: string) => void }) {
  const nav = [
    ['home', '홈'],
    ['map', '지도로 찾기'],
    ['list', '의자 목록'],
    ['about', '소개'],
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container flex min-h-[64px] flex-wrap items-center justify-between gap-3 py-3 md:min-h-[74px] md:flex-nowrap md:py-0">
        <button
          onClick={() => onNavigate('home')}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="홈으로 이동"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1668c7] text-white md:h-10 md:w-10">
            <span className="text-[11px] font-black md:text-sm">SMC</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold tracking-[.14em] text-[#0d9c9a] sm:text-[11px]">SMC REST SPOT</span>
            <span className="block text-base font-extrabold tracking-tight sm:text-lg">숨은 의자 찾기</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {nav.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${active === id ? 'bg-blue-50 text-[#1668c7]' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => onNavigate('list')} aria-label="의자 검색" className="rounded-full p-2 text-slate-600 hover:bg-slate-100">
            <Search size={20} />
          </button>
          <button
            onClick={() => window.location.assign('/admin')}
            aria-label="관리자 모드"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 sm:px-4"
          >
            <Shield size={16} />
            <span className="hidden sm:inline">관리자</span>
          </button>
          <button className="rounded-full p-2 text-slate-600 md:hidden" aria-label="메뉴">
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
