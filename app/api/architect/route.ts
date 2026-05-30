import { NextResponse } from "next/server";
import type { Brief, OrgDesign, Role } from "@/lib/types";
import mockDesign from "@/lib/mocks/design.json";
import { misoChat, extractJson } from "@/lib/miso";
import { buildArchitectGrounding } from "@/lib/knowledge";

export const runtime = "nodejs";

interface ArchitectBody extends Brief {
  conversationId?: string | null;
  prevDesign?: OrgDesign;
  instruction?: string; // §5.4 "엣지로 압축" 등 추가 지시
}

function pickBrief(b: ArchitectBody): Brief {
  return {
    title: b.title,
    summary: b.summary,
    targetCustomer: b.targetCustomer,
    targetRevenue: Number(b.targetRevenue),
    durationMonths: Number(b.durationMonths),
    laborBudget: Number(b.laborBudget),
    hasOffline: Boolean(b.hasOffline),
  };
}

// 목 fallback: 사용자가 입력한 브리프는 살리고 역할만 목 데이터 사용
function mockFallback(brief: Brief): OrgDesign {
  return { project: brief, roles: (mockDesign as OrgDesign).roles };
}

export async function POST(req: Request) {
  let brief: Brief;
  let body: ArchitectBody;
  try {
    body = (await req.json()) as ArchitectBody;
    brief = pickBrief(body);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // §6 공통: MOCK_MODE 또는 키 미설정 → 목 반환
  const key = process.env.MISO_ARCHITECT_KEY;
  if (process.env.MOCK_MODE === "true" || !key) {
    return NextResponse.json({
      design: mockFallback(brief),
      conversationId: null,
      degraded: true,
    });
  }

  // MISO 입력 변수(텍스트형)로 전달 — 앱에서 정의한 6개 변수명과 일치
  const inputs = {
    summary: brief.summary,
    targetCustomer: brief.targetCustomer,
    targetRevenue: String(brief.targetRevenue),
    durationMonths: String(brief.durationMonths),
    laborBudget: String(brief.laborBudget),
    hasOffline: String(brief.hasOffline),
  };

  // P0 그라운딩: NCS 직무·수행준거·노동비용·프로세스맵 근거를 query 에 주입.
  // (MISO 앱의 지식(RAG)을 쓰지 않는 환경에서도 그라운딩이 동작하도록 in-query 주입)
  const grounding = buildArchitectGrounding(brief);

  const baseQuery =
    body.instruction ??
    "위 브리프로 하이브리드 조직을 설계하라. 지침의 JSON 스키마만 출력하라. " +
      "모든 숫자 필드(estimatedAnnualSalary, estimatedMonthlyAiCost, fieldCost.unit, " +
      "fieldCost.volume, targetRevenue, laborBudget 등)는 단위·한글·따옴표 없이 순수 정수로만 쓴다.";

  const query = `${grounding}\n\n---\n${baseQuery}`;

  // §10-4: 모델 JSON 신뢰성 대비 — 파싱 실패 시 재시도, 그래도 실패하면 목 fallback
  const MAX_TRIES = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const data = await misoChat({
        key,
        inputs,
        query,
        // 재시도는 매번 새 컨텍스트로 (오염 방지) — 첫 시도만 이어붙임
        conversationId: attempt === 1 ? body.conversationId ?? undefined : undefined,
      });

      const parsed = extractJson<OrgDesign | { roles: Role[] } | Role[]>(data.answer);
      const rawRoles: Role[] = Array.isArray(parsed)
        ? parsed
        : ((parsed as OrgDesign).roles ?? []);

      if (!rawRoles.length) throw new Error("no roles parsed from MISO answer");

      // project 는 사용자 입력 브리프로 고정 (에이전트 echo 신뢰 안 함)
      const design: OrgDesign = { project: brief, roles: coerceRoles(rawRoles) };

      return NextResponse.json({
        design,
        conversationId: data.conversation_id ?? null,
        degraded: false,
        tries: attempt,
      });
    } catch (err) {
      lastErr = err;
    }
  }

  return NextResponse.json({
    design: mockFallback(brief),
    conversationId: null,
    degraded: true,
    error: String(lastErr),
  });
}

// 숫자 필드가 "50만원" 같은 문자열로 와도 정수로 보정 (파싱은 됐으나 타입이 어긋난 경우)
function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d.-]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function coerceRoles(roles: Role[]): Role[] {
  return roles.map((r) => {
    const out: Role = { ...r };
    if (r.estimatedAnnualSalary !== undefined)
      out.estimatedAnnualSalary = toNum(r.estimatedAnnualSalary);
    if (r.estimatedMonthlyAiCost !== undefined)
      out.estimatedMonthlyAiCost = toNum(r.estimatedMonthlyAiCost);
    if (r.fieldCost) {
      out.fieldCost = {
        ...r.fieldCost,
        unit: toNum(r.fieldCost.unit) ?? 0,
        volume: toNum(r.fieldCost.volume) ?? 0,
      };
    }
    return out;
  });
}
