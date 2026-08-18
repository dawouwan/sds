import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WIRE — 네이버 뉴스 검색",
  description: "키워드로 네이버 뉴스 색인을 훑어보는 개인용 검색 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* next/font는 빌드타임 페치에 의존하므로 쓰지 않는다 (PRD §9) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
