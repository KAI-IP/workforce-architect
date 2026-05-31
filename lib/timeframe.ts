// lib/timeframe.ts — 당사자별(AI 포함) 1~6개월 시행계획 마일스톤 (결정적, PDF 공용)
import type { Lane, OrgDesign, Role } from "./types";

export interface RoleTimeframe {
  roleId: string;
  title: string;
  lane: Lane;
  months: string[]; // months[i] = (i+1)월 마일스톤
}

function pick(arr?: string[]): string | undefined {
  return arr && arr.length ? arr[0] : undefined;
}

function milestone(role: Role, m: number, total: number): string {
  const c = role.cadence ?? {};
  const setup = pick(c.weekly) ?? pick(c.daily) ?? "준비·온보딩";
  const run = pick(c.daily) ?? pick(c.weekly) ?? "운영 수행";
  const scale = pick(c.monthly) ?? "성과 점검·고도화";
  if (m === 1) return `셋업 — ${setup}`;
  if (m <= Math.ceil(total / 3)) return `안정화 — ${run}`;
  if (m <= Math.ceil((2 * total) / 3)) return `운영 — ${run}`;
  return `고도화 — ${scale}`;
}

export function buildTimeframe(design: OrgDesign): { monthCount: number; rows: RoleTimeframe[] } {
  const monthCount = Math.min(6, Math.max(1, Math.ceil(design.project.durationMonths || 1)));
  const rows = design.roles.map((r) => ({
    roleId: r.id,
    title: r.title,
    lane: r.lane,
    months: Array.from({ length: monthCount }, (_, i) => milestone(r, i + 1, monthCount)),
  }));
  return { monthCount, rows };
}
