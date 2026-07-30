'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function ChairImage({
  src,
  alt,
  className = '',
  fit = 'contain',
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: 'cover' | 'contain' | 'natural';
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden ${
        fit === 'natural' ? 'bg-slate-50' : 'image-placeholder'
      } ${className}`}
    >
      {!failed ? (
        <img
          src={src}
          alt={alt}
          className={
            fit === 'natural'
              ? 'block h-auto w-full'
              : `h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`
          }
          onLoad={() => setFailed(false)}
          onError={() => setFailed(true)}
        />
      ) : null}

      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-slate-500">
          <span className="flex flex-col items-center gap-2 text-sm font-bold">
            <ImageOff size={28} />
            사진 준비 중
          </span>
        </div>
      ) : null}
    </div>
  );
}
