'use client';

import type { FormEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  FilePenLine,
  ImagePlus,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { RestSpot } from '@/types/chair';

type MapOption = {
  building: string;
  floor: string;
  mapImage: string;
};

function formatCoord(value: number | null) {
  return typeof value === 'number' ? value.toFixed(1) : '-';
}

function calculateCoords(event: MouseEvent<HTMLButtonElement>, image: HTMLImageElement | null) {
  if (!image) return null;
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return null;

  return {
    x: Math.round((clickX / rect.width) * 1000) / 10,
    y: Math.round((clickY / rect.height) * 1000) / 10,
  };
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AdminModePanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [spots, setSpots] = useState<RestSpot[]>([]);
  const [mapOptions, setMapOptions] = useState<MapOption[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState('');
  const [currentFloor, setCurrentFloor] = useState('');
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [form, setForm] = useState({
    areaName: '',
    description: '',
    seatCount: '',
    tags: '',
    hasOutlet: false,
    isQuiet: false,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  const currentMap = useMemo(() => {
    if (!currentBuilding || !currentFloor) return mapOptions[0] ?? null;
    return mapOptions.find((option) => option.building === currentBuilding && option.floor === currentFloor) ?? null;
  }, [currentBuilding, currentFloor, mapOptions]);

  const currentSpots = useMemo(
    () => spots.filter((spot) => spot.building === currentBuilding && spot.floor === currentFloor),
    [spots, currentBuilding, currentFloor],
  );

  const selectedSpot = selectedSpotId ? spots.find((spot) => spot.id === selectedSpotId) ?? null : null;

  useEffect(() => {
    if (!selectedSpot) return;

    setCurrentBuilding(selectedSpot.building);
    setCurrentFloor(selectedSpot.floor);
    setPendingPin(selectedSpot.pin);
    setForm({
      areaName: selectedSpot.areaName,
      description: selectedSpot.description,
      seatCount: selectedSpot.seatCount === null ? '' : String(selectedSpot.seatCount),
      tags: selectedSpot.tags.join(', '),
      hasOutlet: selectedSpot.hasOutlet,
      isQuiet: selectedSpot.isQuiet,
    });
    setPhotoFile(null);
  }, [selectedSpot]);

  async function bootstrap() {
    setSessionLoading(true);
    try {
      const sessionResponse = await fetch('/api/admin/session', { credentials: 'include' });
      const sessionData = await sessionResponse.json();
      if (!sessionResponse.ok || !sessionData.authenticated) {
        setAuthenticated(false);
        return;
      }

      setAuthenticated(true);
      await loadSpots();
    } catch (err) {
      setError(err instanceof Error ? err.message : '세션 확인에 실패했습니다.');
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadSpots() {
    const response = await fetch('/api/admin/spots', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '관리자 데이터를 불러오지 못했습니다.');
    }

    const nextSpots = Array.isArray(data.spots) ? (data.spots as RestSpot[]) : [];
    const nextOptions = Array.isArray(data.mapOptions) ? (data.mapOptions as MapOption[]) : [];
    setSpots(nextSpots);
    setMapOptions(nextOptions);

    if (!currentBuilding || !currentFloor) {
      const first = nextOptions[0];
      if (first) {
        setCurrentBuilding(first.building);
        setCurrentFloor(first.floor);
      }
    }
  }

  function resetEditor() {
    setSelectedSpotId(null);
    setPendingPin(null);
    setPhotoFile(null);
    setForm({
      areaName: '',
      description: '',
      seatCount: '',
      tags: '',
      hasOutlet: false,
      isQuiet: false,
    });
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;

    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '로그인에 실패했습니다.');

      setAuthenticated(true);
      setPassword('');
      await loadSpots();
      setMessage('관리자 모드로 전환했습니다.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
    setSpots([]);
    setMapOptions([]);
    setCurrentBuilding('');
    setCurrentFloor('');
    setSelectedSpotId(null);
    setPendingPin(null);
    setPhotoFile(null);
    setMessage('');
    setError('');
  }

  function handleMapClick(event: MouseEvent<HTMLButtonElement>) {
    const coords = calculateCoords(event, imgRef.current);
    if (!coords) return;

    setPendingPin(coords);
    setSelectedSpotId(null);
    setMessage(`좌표를 선택했습니다. x ${coords.x.toFixed(1)}%, y ${coords.y.toFixed(1)}%`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentMap || !pendingPin) {
      setError('먼저 지도 위에서 좌표를 선택해 주세요.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const body = new FormData();
      body.set('building', currentBuilding);
      body.set('floor', currentFloor);
      body.set('pinX', String(pendingPin.x));
      body.set('pinY', String(pendingPin.y));
      body.set('areaName', form.areaName.trim());
      body.set('description', form.description.trim());
      body.set('seatCount', form.seatCount.trim());
      body.set('tags', form.tags.trim());
      body.set('hasOutlet', String(form.hasOutlet));
      body.set('isQuiet', String(form.isQuiet));
      if (photoFile) body.set('photo', photoFile);

      const endpoint = selectedSpotId ? `/api/admin/spots/${selectedSpotId}` : '/api/admin/add-spot';
      const response = await fetch(endpoint, {
        method: selectedSpotId ? 'PUT' : 'POST',
        credentials: 'include',
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '저장에 실패했습니다.');

      await loadSpots();
      if (data.spot?.id) {
        setSelectedSpotId(data.spot.id as string);
      } else {
        resetEditor();
      }
      setMessage(selectedSpotId ? '휴식공간 정보를 수정했습니다.' : '새 휴식공간을 저장했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedSpotId) return;
    if (!window.confirm('이 휴식공간을 삭제할까요?')) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/spots/${selectedSpotId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '삭제에 실패했습니다.');

      resetEditor();
      await loadSpots();
      setMessage('휴식공간을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(24,50,74,0.08)]">
          세션을 확인하는 중입니다...
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0f7ff,_#f7fbfd_40%,_#eef4f7_100%)] px-4 py-10 text-[#18324a]">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#0d9c9a] shadow-sm">
              <Lock size={14} />
              ADMIN MODE
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">
              관리자 비밀번호를 입력하면
              <span className="block text-[#1668c7]">관리자 모드로 전환됩니다.</span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-slate-600">
              로그인 후에는 약도 위에서 좌표를 찍고, 새 휴식공간을 등록하거나 기존 항목을 수정하고 삭제할 수 있습니다.
            </p>
          </section>

          <form onSubmit={handleLogin} className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(24,50,74,0.12)] backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1668c7] text-white">
                <Lock size={22} />
              </span>
              <div>
                <strong className="block text-lg">관리자 로그인</strong>
                <span className="text-sm text-slate-500">httpOnly 세션 쿠키로 인증합니다.</span>
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-600">비밀번호</span>
              <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder="관리자 비밀번호"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-slate-500"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={authLoading || !password.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1668c7] px-4 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {authLoading ? <RefreshCw size={18} className="animate-spin" /> : <Lock size={18} />}
              로그인
            </button>

            {authError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {authError}
              </div>
            )}

            <p className="mt-4 text-xs leading-6 text-slate-500">
              운영 환경에서는 `ADMIN_PASSWORD_HASH`와 `ADMIN_SESSION_SECRET`를 설정해 주세요. 해시가 없으면 개발용 기본 비밀번호를 사용할 수 있습니다.
            </p>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6fafc_0%,#eef6f7_45%,#f8fbfd_100%)] px-4 py-6 text-[#18324a]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(24,50,74,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#0d9c9a]">ADMIN MODE</p>
            <h1 className="mt-2 text-2xl font-black">휴식공간 관리자 모드</h1>
            <p className="mt-1 text-sm text-slate-500">지도를 클릭해 좌표를 찍고, 휴식공간을 추가하거나 수정/삭제할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSpots()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </header>

        {(error || message) && (
          <div className="grid gap-3 md:grid-cols-2">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <Check size={18} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/70 bg-white p-4 shadow-[0_18px_60px_rgba(24,50,74,0.08)]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="min-w-[180px] flex-1">
                <span className="mb-2 block text-xs font-bold tracking-[0.16em] text-slate-500">건물</span>
                <select
                  value={currentBuilding}
                  onChange={(event) => {
                    const nextBuilding = event.target.value;
                    setCurrentBuilding(nextBuilding);
                    const nextFloor = mapOptions.find((option) => option.building === nextBuilding)?.floor || '';
                    setCurrentFloor(nextFloor);
                    resetEditor();
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {Array.from(new Set(mapOptions.map((option) => option.building))).map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[180px] flex-1">
                <span className="mb-2 block text-xs font-bold tracking-[0.16em] text-slate-500">층</span>
                <select
                  value={currentFloor}
                  onChange={(event) => {
                    setCurrentFloor(event.target.value);
                    resetEditor();
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {mapOptions
                    .filter((option) => option.building === currentBuilding)
                    .map((option) => (
                      <option key={`${option.building}-${option.floor}`} value={option.floor}>
                        {option.floor}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3">
              {currentMap ? (
                <button
                  type="button"
                  onClick={handleMapClick}
                  className="group relative block w-full overflow-hidden rounded-[24px] bg-white text-left"
                >
                  <img
                    ref={imgRef}
                    src={currentMap.mapImage}
                    alt={`${currentMap.building} ${currentMap.floor} map`}
                    className="block h-auto w-full select-none"
                    draggable={false}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,156,154,0.08),transparent_55%)]" />

                  {currentSpots.map((spot) => {
                    const isSelected = spot.id === selectedSpotId;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedSpotId(spot.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-lg transition ${
                          isSelected ? 'z-30 animate-pulse bg-[#1668c7]' : 'z-20 bg-[#0d9c9a]'
                        }`}
                        style={{ left: `${spot.pin.x}%`, top: `${spot.pin.y}%`, width: isSelected ? 22 : 18, height: isSelected ? 22 : 18 }}
                        aria-label={spot.areaName}
                      />
                    );
                  })}

                  {pendingPin && (
                    <span
                      className="absolute z-40 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-white bg-amber-400 shadow-lg"
                      style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, width: 22, height: 22 }}
                    />
                  )}

                  <div className="absolute bottom-4 left-4 rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-white backdrop-blur">
                    <div className="flex items-center gap-2 font-bold">
                      <MapPin size={16} />
                      {currentMap.building} {currentMap.floor}
                    </div>
                    <p className="mt-1 text-xs text-slate-200">지도를 클릭하면 새 좌표가 계산됩니다.</p>
                  </div>
                </button>
              ) : (
                <div className="grid min-h-[420px] place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white text-center text-slate-500">
                  <div>
                    <ImagePlus size={32} className="mx-auto mb-3 text-[#1668c7]" />
                    <strong className="block">지도를 찾을 수 없습니다</strong>
                    <p className="mt-2 text-sm">선택한 건물/층에 연결된 mapImage가 필요합니다.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoCard title="현재 좌표" value={pendingPin ? `${formatCoord(pendingPin.x)}%, ${formatCoord(pendingPin.y)}%` : '아직 없음'} />
              <InfoCard title="등록된 spot" value={`${currentSpots.length}개`} />
              <InfoCard title="선택 위치" value={currentMap ? `${currentMap.building} ${currentMap.floor}` : '-'} />
            </div>
          </div>

          <aside className="space-y-6">
            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_rgba(24,50,74,0.08)]">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1668c7] text-white">
                  <FilePenLine size={22} />
                </span>
                <div>
                  <strong className="block text-lg">{selectedSpotId ? '휴식공간 수정' : '새 휴식공간 등록'}</strong>
                  <span className="text-sm text-slate-500">좌표 선택 후 정보를 입력해 저장하세요.</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-600">X 좌표</span>
                    <input
                      value={formatCoord(pendingPin?.x ?? null)}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-600">Y 좌표</span>
                    <input
                      value={formatCoord(pendingPin?.y ?? null)}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">사진 업로드</span>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                    <Upload size={18} className="text-[#1668c7]" />
                    <span className="min-w-0 flex-1 text-sm text-slate-600">{photoFile ? photoFile.name : '이미지 파일을 선택하세요'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">공간 이름</span>
                  <input
                    value={form.areaName}
                    onChange={(event) => setForm((current) => ({ ...current, areaName: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1668c7]"
                    placeholder="예: 내과 화장실 옆 휴게공간"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">설명</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1668c7]"
                    placeholder="의자 수, 콘센트, 조용함 등 실제로 도움이 되는 정보를 적어주세요."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-600">좌석 수</span>
                    <input
                      type="number"
                      value={form.seatCount}
                      onChange={(event) => setForm((current) => ({ ...current, seatCount: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1668c7]"
                      placeholder="모르면 비워두기"
                      min="0"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-600">태그</span>
                    <input
                      value={form.tags}
                      onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1668c7]"
                      placeholder="벤치, 콘센트 있음, 조용함"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.hasOutlet}
                      onChange={(event) => setForm((current) => ({ ...current, hasOutlet: event.target.checked }))}
                    />
                    콘센트 있음
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isQuiet}
                      onChange={(event) => setForm((current) => ({ ...current, isQuiet: event.target.checked }))}
                    />
                    조용함
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !pendingPin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1668c7] px-4 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                저장
              </button>

              {!pendingPin && (
                <p className="mt-3 text-xs leading-6 text-slate-500">먼저 지도 위를 클릭해서 좌표를 선택해 주세요.</p>
              )}

              {selectedSpotId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:bg-rose-100"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              )}
            </form>

            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_rgba(24,50,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <strong className="block text-lg">현재 층의 spot</strong>
                  <span className="text-sm text-slate-500">{currentMap ? `${currentMap.building} ${currentMap.floor}` : '선택된 층 없음'}</span>
                </div>
                <span className="rounded-full bg-[#e8f4ff] px-3 py-1 text-xs font-bold text-[#1668c7]">{currentSpots.length}개</span>
              </div>

              <div className="space-y-3">
                {currentSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => setSelectedSpotId(spot.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedSpotId === spot.id ? 'border-[#1668c7] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-sm">{spot.areaName}</strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          x {spot.pin.x.toFixed(1)}%, y {spot.pin.y.toFixed(1)}%
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">선택</span>
                    </div>
                  </button>
                ))}

                {!currentSpots.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    아직 이 층에 등록된 휴식공간이 없습니다.
                  </div>
                )}
              </div>

              {selectedSpot && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <strong className="block text-sm">{selectedSpot.areaName}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedSpot.description}</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(24,50,74,0.06)]">
      <span className="block text-xs font-bold tracking-[0.16em] text-slate-500">{title}</span>
      <strong className="mt-2 block text-sm">{value}</strong>
    </div>
  );
}
