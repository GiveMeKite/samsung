import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '숨은 휴식공간 찾기',
  description: '삼성서울병원 원내 휴식공간과 편의시설 위치를 정리하는 서비스입니다.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
