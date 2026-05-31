// lib/cost.ts — §7 비용 모델 (클라이언트·결정적). PoC 가정값, 재무자문 아님.
import type { Role, Seniority, OrgDesign, Lane, EmployWindow, Brief, ProjectType } from "./types";
import { effectiveProjectType, type Timeline } from "./timeline";

const WEEKS_PER_YEAR = 52;

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

const FIELD_SANITY_CEIL = 12000; // 1.2억/년/인 초과 fieldCost = 비정상(모델 환각)으로 간주

// FIELD 1인 연비용 — 비정상 fieldCost 방어 후 연봉 기반으로 폴백
function fieldUnitCost(role: Role): number {
  const sen = role.seniority ?? "MIDLEVEL";
  const bySalary = role.estimatedAnnualSalary ? Math.round(role.estimatedAnnualSalary * SENIORITY_MULT[sen]) : 0;
  const byField = role.fieldCost ? fieldAnnual(role.fieldCost) : 0;
  if (byField > 0 && byField <= FIELD_SANITY_CEIL) return byField; // 합리적 현장비용
  if (bySalary > 0) return bySalary; // 비정상 fieldCost → 연봉 환산
  return Math.min(byField || 3000, FIELD_SANITY_CEIL); // 최후 캡
}

// 역할 1개의 연 비용(만원) — 레인별 분기. headcount 반영.
export function roleCost(role: Role): number {
  const n = role.headcount && role.headcount > 0 ? role.headcount : 1;
  let unit: number;
  if (role.lane === "AI") unit = aiAnnual(role.estimatedMonthlyAiCost ?? 0);
  else if (role.lane === "FIELD") unit = fieldUnitCost(role);
  else unit = edgeAnnual(role.estimatedAnnualSalary ?? 0, role.seniority ?? "MIDLEVEL");
  return unit * n;
}

// rank1: 역할 고용구간 (EDGE/AI=both, FIELD=operation 기본)
export function defaultWindow(lane: Lane): EmployWindow {
  return lane === "FIELD" ? "operation" : "both";
}
export function effectiveWindow(role: Role): EmployWindow {
  return role.employWindow ?? defaultWindow(role.lane);
}

// 역할이 실제 청구되는 주수 (고용구간 + 타임라인)
export function billedWeeks(role: Role, t: Timeline): number {
  const w = effectiveWindow(role);
  if (w === "operation") return t.opWeeks; // field: 운영기간만
  if (w === "prep") return t.prepWeeks;
  return t.prepWeeks + t.opWeeks; // both: edge/AI = 준비+운영
}

// 프로젝트 인지형 역할 비용(만원). 장기=연 비용, 단기=주단위 환산 × 청구주수
export function roleProjectCost(role: Role, project: Brief, t?: Timeline): number {
  const annual = roleCost(role);
  if (effectiveProjectType(project) === "LONGTERM" || !t) return annual;
  return Math.round((annual / WEEKS_PER_YEAR) * billedWeeks(role, t));
}

export interface Balance {
  ai: number;
  edge: number;
  field: number;
  total: number;
  budget: number;
  over: number; // total - budget (>0 이면 초과)
  projectType: ProjectType;
}

// §7 밸런스: total = Σedge + Σfield + Σai, over = total - budget. 단기면 timeline으로 환산.
export function computeBalance(design: OrgDesign, t?: Timeline): Balance {
  const p = design.project;
  const projectType = effectiveProjectType(p);
  let ai = 0,
    edge = 0,
    field = 0;
  for (const r of design.roles) {
    const c = projectType === "SHORTTERM" && t ? roleProjectCost(r, p, t) : roleCost(r);
    if (r.lane === "AI") ai += c;
    else if (r.lane === "FIELD") field += c;
    else edge += c;
  }
  const total = ai + edge + field;
  const budget = p.laborBudget || Math.round(p.targetRevenue * 0.08);
  return { ai, edge, field, total, budget, over: total - budget, projectType };
}
