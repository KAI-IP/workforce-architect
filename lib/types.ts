// lib/types.ts — §4 데이터 계약 (가장 중요, 먼저 고정)
export type Lane = 'AI' | 'EDGE' | 'FIELD';
export type Seniority = 'BEGINNER' | 'JUNIOR' | 'MIDLEVEL' | 'SENIOR' | 'EXECUTIVE';

export interface Brief {
  title: string;
  summary: string;
  targetCustomer: string;
  targetRevenue: number; // 만원/년
  durationMonths: number;
  laborBudget: number; // 만원/년 (인건비 예산)
  hasOffline: boolean;
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
