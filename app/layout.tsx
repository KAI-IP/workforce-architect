import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Workforce Architect — AI-네이티브 조직 설계 시뮬레이터",
  description:
    "사업 브리프만 입력하면 무엇을 AI에 맡기고 무엇을 사람이 해야 할지까지 설계해주는 AI-네이티브 컴퍼니 빌더. 뽑기 전에 각자의 임무가 적힌 실행문서를 손에 쥐여줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
