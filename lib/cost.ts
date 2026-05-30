// lib/cost.ts — §7 비용 모델 (클라이언트·결정적). PoC 가정값, 재무자문 아님.
import type { Role, Seniority, OrgDesign } from "./types";

export const SENIORITY_MULT: Record<Seniority, number> = {
  BEGINNER: 0.6,
  JUNIOR: 0.8,
  MIDLEVEL: 1.0,
  SENIOR: 1.4,
  EXECUTIVE: 2.0,
};

export const EDGE_BURDEN = 1.2; // 퇴직금 적립 ~8.3% + 4대보험 사업자부담 ~10% + 고정비

// Edge 인간(연 만원)
export function edgeAnnual(baseSalary: number, sen: Seniority): number {
  return Math.round(baseSalary * SENIORITY_MULT[sen] * EDGE_BURDEN);
}

// Field 인간(연 만원) — 퇴직/보험 제외
export function fieldAnnual(fc: NonNullable<Role["fieldCost"]>): number {
  const { type, unit, volume } = fc;
  switch (type) {
    case "per_visit":
      return Math.round(unit * volume * 12);
    case "hourly":
      return Math.round(unit * volume * 12);
    case "outsource_monthly":
      return Math.round(unit * 12);
    default:
      return 0;
  }
}

// AI(연 만원) = MISO 월비용 * 12
export function aiAnnual(monthlyAiCost: number): number {
  return Math.round(monthlyAiCost * 12);
}

// 역할 1개의 연 비용(만원) — 레인별 분기
export function roleCost(role: Role): number {
  if (role.lane === "AI") return aiAnnual(role.estimatedMonthlyAiCost ?? 0);
  if (role.lane === "FIELD" && role.fieldCost) return fieldAnnual(role.fieldCost);
  // EDGE (또는 fieldCost 없는 FIELD)
  return edgeAnnual(role.estimatedAnnualSalary ?? 0, role.seniority ?? "MIDLEVEL");
}

export interface Balance {
  ai: number;
  edge: number;
  field: number;
  total: number;
  budget: number;
  over: number; // total - budget (>0 이면 초과)
}

// §7 밸런스: total = Σedge + Σfield + Σai, over = total - budget
export function computeBalance(design: OrgDesign): Balance {
  let ai = 0,
    edge = 0,
    field = 0;
  for (const r of design.roles) {
    const c = roleCost(r);
    if (r.lane === "AI") ai += c;
    else if (r.lane === "FIELD" && r.fieldCost) field += c;
    else edge += c;
  }
  const total = ai + edge + field;
  const budget = design.project.laborBudget || Math.round(design.project.targetRevenue * 0.08);
  return { ai, edge, field, total, budget, over: total - budget };
}
