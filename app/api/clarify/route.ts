import { NextResponse } from "next/server";
import type { Brief } from "@/lib/types";
import { misoChat, extractJson } from "@/lib/miso";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
}

const SCHEMA = '{"questions":[{"id":string,"question":string,"options":[string]}]}';

// 결정적 fallback (MISO 실패/지연 대비) — 일반적이지만 직군·운영 모호함을 줄이는 질문
function deterministic(): ClarifyQuestion[] {
  return [
    {
      id: "core_role",
      question: "이 사업의 핵심 실무 인력은 어떤 직군에 가장 가깝나요?",
      options: ["전문 자격·면허 보유 전문가", "현장 숙련 기술자", "일반 운영·서비스 인력", "기타(자연어로 보완)"],
    },
    {
      id: "ops_mode",
      question: "운영 방식은 어디에 가깝나요?",
      options: ["상시 운영(장기 비즈니스)", "한시 프로젝트·팝업(단기)", "온라인 중심", "오프라인 매장 중심"],
    },
    {
      id: "ai_priority",
      question: "AI로 가장 먼저 자동화하고 싶은 영역은?",
      options: ["고객 추천·CRM", "마케팅·콘텐츠", "수요예측·재고", "운영 데이터 분석"],
    },
  ];
}

export async function POST(req: Request) {
  let brief: Brief;
  try {
    brief = (await req.json()) as Brief;
    if (!brief?.summary) throw new Error("no brief");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const key = process.env.MISO_ARCHITECT_KEY;
  if (process.env.MOCK_MODE === "true" || !key) {
    return NextResponse.json({ questions: deterministic(), degraded: true });
  }

  const query =
    `이 사업을 정확히 조직설계하기 위해 꼭 필요한 핵심 질문 3~4개를 객관식으로 만들어라(조직설계는 아직 하지 마라). ` +
    `각 질문 options 는 3~4개. 특히 "핵심 실무 인력의 직군/전문성"을 명확히 해 오분류(예: 스트레치/재활을 조리로 잘못 보는 것)를 막는 질문을 반드시 포함하라. ` +
    `JSON으로만 출력. 스키마: ${SCHEMA}. ` +
    `사업: ${brief.title} / ${brief.summary} / 타겟: ${brief.targetCustomer}`;

  try {
    const data = await misoChat({
      key,
      inputs: {
        summary: brief.summary,
        targetCustomer: brief.targetCustomer || "일반",
        targetRevenue: String(brief.targetRevenue),
        durationMonths: String(brief.durationMonths),
        laborBudget: String(brief.laborBudget),
        hasOffline: String(brief.hasOffline),
      },
      query,
      timeoutMs: 22000,
    });
    const parsed = extractJson<{ questions?: ClarifyQuestion[] }>(data.answer);
    const questions = (parsed.questions ?? []).filter((q) => q.question && q.options?.length).slice(0, 4);
    if (!questions.length) throw new Error("no questions");
    return NextResponse.json({ questions, degraded: false });
  } catch {
    return NextResponse.json({ questions: deterministic(), degraded: true });
  }
}
