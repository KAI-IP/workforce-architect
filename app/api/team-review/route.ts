import { NextResponse } from "next/server";
import type { Brief, Seniority, TeamReview } from "@/lib/types";

export const runtime = "nodejs";

interface Card {
  roleId: string;
  title: string;
  lane: string;
  seniority?: Seniority;
  headcount?: number;
  personaLabel?: string;
  jobCategoryQuery?: string;
}
interface Body {
  project: Brief;
  cards: Card[];
  conversationId?: string | null;
}


// 결정적 프리체크: MISO 없이도/실패해도 동작하는 적정성 추정
function deterministicReview(project: Brief, cards: Card[]): TeamReview {
  if (!cards.length) {
    return { adequacy: "GAP", comment: "덱이 비어 있습니다. 역할 카드를 배치하세요.", suggestions: [], missingCapabilities: [] };
  }
  const estDailyHours = project.hasOffline ? 10 : 8;
  const minHead = Math.ceil(estDailyHours / 8);
  const suggestions: TeamReview["suggestions"] = [];
  let worst: TeamReview["adequacy"] = "OK";

  for (const c of cards) {
    const hc = c.headcount ?? 1;
    const human = c.lane === "EDGE" || c.lane === "FIELD";
    if (human && (c.seniority === "BEGINNER" || c.seniority === "JUNIOR") && hc < 2) {
      suggestions.push({
        roleId: c.roleId,
        kind: "RAISE_SENIORITY",
        target: "MIDLEVEL",
        reason: `${c.title}이(가) ${c.seniority === "BEGINNER" ? "신입" : "주니어"} 단독 — 운영 판단 엣지에 현장경력 보강 권장`,
      });
      worst = "CAUTION";
    }
    if (c.lane === "FIELD" && hc < minHead) {
      suggestions.push({
        roleId: c.roleId,
        kind: "ADD_HEADCOUNT",
        target: minHead,
        reason: `운영시간 추정 ${estDailyHours}h/일 → 1인 커버 한계, ${minHead}명 권장`,
      });
      worst = "CAUTION";
    }
  }
  const hasHuman = cards.some((c) => c.lane === "EDGE");
  const missing: string[] = hasHuman ? [] : ["사람 엣지(최종 판단·가드레일) 부재"];
  if (!hasHuman) worst = "GAP";

  return {
    adequacy: worst,
    comment:
      worst === "OK"
        ? "이 팀 구성이면 미션 수행이 가능합니다."
        : worst === "GAP"
          ? "핵심 역량이 비어 있습니다. 인간 엣지 역할을 추가하세요."
          : suggestions[0]?.reason ?? "일부 역할에 보강이 필요합니다.",
    suggestions,
    missingCapabilities: missing,
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
    if (!body.cards) throw new Error("no cards");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // 덱 변경마다 호출되는 라이브 경로 → 결정적 규칙 엔진으로 즉시 응답(운영시간·시니어리티·역량 기반).
  // (MISO chat-agent 는 이 질의에 ~18-25s 소요로 라이브 UX 부적합 — 무거운 분해/페르소나/미션 도출에 집중 사용.)
  const review = deterministicReview(body.project, body.cards);
  return NextResponse.json({ review, conversationId: null, degraded: false });
}
