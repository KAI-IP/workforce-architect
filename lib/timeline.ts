// lib/timeline.ts — rank1 시간 모델: 장기/단기 분류 + 준비기간 예측
import type { Brief, ProjectType } from "./types";

export const SHORTTERM_MAX_MONTHS = 3; // 3개월 미만 = 단기 프로젝트(팝업/캠페인/단발행사)

export function classifyProjectType(durationMonths: number): ProjectType {
  return durationMonths < SHORTTERM_MAX_MONTHS ? "SHORTTERM" : "LONGTERM";
}

// override > 저장값 > 자동분류
export function effectiveProjectType(brief: Brief): ProjectType {
  return brief.projectTypeOverride ?? brief.projectType ?? classifyProjectType(brief.durationMonths);
}

export interface Timeline {
  prepWeeks: number;
  opWeeks: number;
  marketingPrepWeeks: number;
  totalWeeks: number;
}

// 준비기간 예측: 프로세스 스테이지 수(핸드오프 셋업) + 오프라인 가산 + 사전 마케팅(병렬)
export function estimateTimeline(brief: Brief, stageCount: number): Timeline {
  const opWeeks = brief.opWeeks ?? Math.max(1, Math.round(brief.durationMonths * 4.33));
  let setupWeeks = Math.max(1, Math.ceil(stageCount * 0.5)); // 예: 5스테이지 → 3주
  if (brief.hasOffline) setupWeeks += 1; // 현장 셋업(공간·인허가·집기)
  const marketingPrepWeeks = Math.min(4, Math.max(1, Math.round(opWeeks * 0.5)));
  const prepWeeks = Math.max(setupWeeks, marketingPrepWeeks); // 병렬 진행 가정
  return { prepWeeks, opWeeks, marketingPrepWeeks, totalWeeks: prepWeeks + opWeeks };
}
