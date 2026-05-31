// lib/links.ts — rank2: [고용 시도하기] 로켓펀치 딥링크 (client-safe)
import type { Role } from "./types";

// 합성 페르소나 → "실제 채용공고/회사"로 연결 (PII: 개인 아님).
// 2단 설계: API 복구 시 개별 공고 id, 현재는 키워드 검색 딥링크(웹 라우트는 500과 독립적으로 동작).
export function rocketpunchUrl(role: Role): string {
  // 향후 API 복구 시: role.rocketpunchJobId → /jobs/{id}
  const kw = [role.jobCategoryQuery || role.title, role.seniority === "BEGINNER" ? "신입" : ""]
    .filter(Boolean)
    .join(",");
  return `https://www.rocketpunch.com/jobs?keywords=${encodeURIComponent(kw)}`;
}
