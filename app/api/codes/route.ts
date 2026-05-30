import { NextResponse } from "next/server";
import mockCodes from "@/lib/mocks/codes.json";

export const runtime = "nodejs";

// §6: 서버 메모리 캐싱(앱 생애 1회). 로켓펀치 /codes/* 가 확정/복구되면 여기서 실 호출로 교체.
let cache: unknown = null;

export async function GET() {
  if (!cache) cache = mockCodes;
  // 현재 로켓펀치 codes 스키마 미확정 → 목 제공(degraded). free-text query 검색이라 골든패스 비필수.
  return NextResponse.json({ ...(cache as object), degraded: true });
}
