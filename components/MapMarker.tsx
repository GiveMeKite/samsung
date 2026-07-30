'use client';

import type { MouseEvent } from 'react';
import { getMarkerVariant, hasWheelchairBadge, isPillMarker, MARKER_PALETTE } from '@/lib/marker-variants';
import type { Chair } from '@/types/chair';

function BoltGlyph() {
  return <path d="M13 2 5 13h5l-1 9 8-11h-5z" fill="currentColor" />;
}

function TableGlyph() {
  return (
    <>
      <path d="M5 9h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 9v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 9v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function PinBody({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 32 44" className="block h-full w-full drop-shadow-[0_3px_8px_rgba(15,23,42,0.22)]" aria-hidden="true">
      <path
        d="M16 42.5C16 42.5 28.4 30.6 28.4 19.1C28.4 11.8 22.8 5.5 16 5.5C9.2 5.5 3.6 11.8 3.6 19.1C3.6 30.6 16 42.5 16 42.5Z"
        fill={fill}
      />
      <circle cx="16" cy="18.9" r="8.1" fill="rgba(255,255,255,0.92)" />
    </svg>
  );
}

function WheelchairBadge() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#2563EB] text-[11px] font-black leading-none text-white shadow-md">
      P
    </span>
  );
}

export default function MapMarker({
  chair,
  x,
  y,
  selected = false,
  onActivate,
}: {
  chair: Pick<Chair, 'id' | 'name' | 'hasOutlet' | 'hasTable' | 'hasWheelchairParking'>;
  x: number;
  y: number;
  selected?: boolean;
  onActivate: () => void;
}) {
  const variant = getMarkerVariant(chair);
  const pill = isPillMarker(variant);
  const showWheelchairBadge = hasWheelchairBadge(variant);
  const baseColor = MARKER_PALETTE.base;
  const chargeColor = MARKER_PALETTE.charge;
  const tableColor = MARKER_PALETTE.table;
  const wheelchairColor = MARKER_PALETTE.wheelchair;

  const transform = pill
    ? `translate(-50%, -50%) scale(${selected ? 1.08 : 1})`
    : `translate(-50%, -100%) scale(${selected ? 1.08 : 1})`;

  return (
    <button
      type="button"
      aria-label={`${chair.name} 위치 보기`}
      title={chair.name}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onActivate();
      }}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform,
        zIndex: selected ? 40 : 20,
      }}
      className="absolute cursor-pointer select-none outline-none transition-transform duration-150 ease-out focus-visible:scale-110"
    >
      {pill ? (
        <div className="relative h-[32px] w-[58px]">
          <svg
            viewBox="0 0 58 32"
            className="block h-full w-full drop-shadow-[0_3px_8px_rgba(15,23,42,0.22)]"
            aria-hidden="true"
          >
            <rect x="1.5" y="3" width="55" height="24" rx="12" fill="white" />
            <rect x="4" y="5.5" width="25" height="19" rx="9.5" fill={chargeColor} />
            <rect x="29" y="5.5" width="25" height="19" rx="9.5" fill={tableColor} />
            <rect x="28" y="5.5" width="2" height="19" rx="1" fill="rgba(255,255,255,0.84)" />
            <g transform="translate(10 8.5)" className="text-white">
              <BoltGlyph />
            </g>
            <g transform="translate(35 9)" className="text-white">
              <TableGlyph />
            </g>
          </svg>
          {showWheelchairBadge ? (
            <span className="absolute -right-1 -top-1">
              <WheelchairBadge />
            </span>
          ) : null}
        </div>
      ) : (
        <div className="relative h-[44px] w-[32px]">
          <PinBody
            fill={
              variant === 'charge'
                ? chargeColor
                : variant === 'table'
                  ? tableColor
                  : variant === 'wheelchair'
                    ? wheelchairColor
                    : variant === 'charge-wheelchair'
                      ? chargeColor
                      : variant === 'table-wheelchair'
                        ? tableColor
                        : baseColor
            }
          />

          <div className="absolute inset-0 grid place-items-center text-white">
            {variant === 'charge' || variant === 'charge-wheelchair' ? (
              <span className="translate-y-[-1px] text-[15px] font-black leading-none">⚡</span>
            ) : variant === 'table' || variant === 'table-wheelchair' ? (
              <svg viewBox="0 0 24 24" className="block h-4 w-4 text-white" aria-hidden="true">
                <TableGlyph />
              </svg>
            ) : variant === 'wheelchair' ? (
              <span className="text-[13px] font-black leading-none">P</span>
            ) : (
              <span className="h-3 w-3 rounded-full bg-white/90" />
            )}
          </div>

          {showWheelchairBadge ? (
            <span className="absolute -right-1 top-1">
              <WheelchairBadge />
            </span>
          ) : null}
        </div>
      )}
      {selected ? <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#18324a]/30" /> : null}
    </button>
  );
}
