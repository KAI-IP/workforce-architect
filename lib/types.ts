// lib/types.ts — §4 데이터 계약 (가장 중요, 먼저 고정)
export type Lane = 'AI' | 'EDGE' | 'FIELD';
export type Seniority = 'BEGINNER' | 'JUNIOR' | 'MIDLEVEL' | 'SENIOR' | 'EXECUTIVE';

// 장기 비즈니스(연봉) vs 단기 프로젝트(준비+운영, 주 단위)
export type ProjectType = 'LONGTERM' | 'SHORTTERM';
// 역할 고용 구간: 준비기간 / 운영기간 / 둘 다
export type EmployWindow = 'prep' | 'operation' | 'both';

export interface Brief {
  title: string;
  summary: string;
  targetCustomer: string;
  targetRevenue: number; // 만원/년
  durationMonths: number; // 소수 허용(0.5 = 약 2주)
  laborBudget: number; // 장기: 만원/년 · 단기: 만원/프로젝트 총액
  hasOffline: boolean;
  // 시간 모델 (rank1)
  projectType?: ProjectType; // 자동분류 결과(저장용)
  projectTypeOverride?: ProjectType; // 수동 override(있으면 우선)
  opWeeks?: number; // 단기 운영기간(주)
}

export interface Role {
  id: string;
  title: string;
  lane: Lane;
  rationale: string; // 왜 이 레인인가 (엣지/체화/composable 근거)
  // 인간(EDGE/FIELD) 공통
  jobCategoryQuery?: string; // 로켓펀치 직군 매핑용 키워드
  seniority?: Seniority;
  workType?: 'ONSITE' | 'HYBRID' | 'REMOTE';
  estimatedAnnualSalary?: number; // 만원 (Edge 비용 기준)
  // FIELD 전용 비용모델
  fieldCost?: { type: 'per_visit' | 'hourly' | 'outsource_monthly'; unit: number; volume: number };
  // AI 전용
  misoCapability?: string; // 어떤 MISO 앱/워크플로우
  estimatedMonthlyAiCost?: number; // 만원
  // 시간 모델 (rank1): 고용 구간 (EDGE=both, FIELD=operation, AI=both 기본)
  employWindow?: EmployWindow;
  headcount?: number; // rank3 인원 제안 (기본 1)
  // 조직 대시보드 (rank4): 보고/감독 관계 + 업무 주기
  reportsTo?: string | null; // 보고자 role id (최상위는 null)
  supervisedBy?: string | null; // 감독자 role id (AI/FIELD는 인간 감독자 필수)
  cadence?: Cadence;
}

export interface Cadence {
  daily?: string[];
  weekly?: string[];
  monthly?: string[];
}

// rank3 카드덱: 역할 슬롯 + 선택된 페르소나 1장
export interface DeckCardData {
  instanceId: string;
  roleId: string;
  persona: Persona;
}

export type SuggestionKind = "ADD_HEADCOUNT" | "RAISE_SENIORITY" | "ADD_ROLE" | "COVER_BY_AI";

export interface TeamReview {
  adequacy: "OK" | "CAUTION" | "GAP";
  comment: string;
  suggestions: {
    roleId: string;
    kind: SuggestionKind;
    target?: number | Seniority;
    reason: string;
  }[];
  missingCapabilities: string[];
}

export interface OrgDesign {
  project: Brief;
  roles: Role[];
}

// 페르소나(팝오버에서 lazy 생성)
export interface Persona {
  label: string;
  seniority: Seniority;
  years: number;
  domain: string;
  workPref: string;
  reason: string; // 엣지/체화 사유
}

export interface PersonaResult {
  personas: Persona[];
  market: {
    supply: number;
    samples: { title: string; company: string; qualification: string; url: string }[];
  };
}
