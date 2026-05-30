import { NextResponse } from "next/server";
import mockJobs from "@/lib/mocks/jobs.json";
import { searchJobs, parseJobs, type JobSample } from "@/lib/rocketpunch";

export const runtime = "nodejs";

// 데모 안정화: 쿼리별로 다른(결정적) 공급량을 만들어 카드마다 다른 "시장 N건" 표기
function mockResult(q: string) {
  const seed = Array.from(q).reduce((a, c) => a + c.charCodeAt(0), 0);
  const supply = 18 + (seed % 182);
  return {
    supply,
    samples: (mockJobs as { samples: JobSample[] }).samples ?? [],
    degraded: true,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("cat") || "";
  const key = process.env.ROCKETPUNCH_API_KEY;

  // §6 공통: MOCK_MODE / 키 없음 / 쿼리 없음 → 목
  if (process.env.MOCK_MODE === "true" || !key || !q) {
    return NextResponse.json(mockResult(q));
  }

  // 실 API (try/catch → 실패 시 목 fallback + degraded)
  try {
    const data = await searchJobs(q, key);
    const { supply, samples } = parseJobs(data);
    return NextResponse.json({ supply, samples, degraded: false });
  } catch (err) {
    return NextResponse.json({ ...mockResult(q), error: String(err) });
  }
}
