'use client';
import { ImageOff } from 'lucide-react';
export default function ChairImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return <div className={`image-placeholder relative overflow-hidden ${className}`}><img src={src} alt={alt} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div className="absolute inset-0 grid place-items-center"><span className="flex flex-col items-center gap-2 text-sm font-bold"><ImageOff size={28} />사진 준비 중</span></div></div>;
}
