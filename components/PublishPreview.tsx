"use client";

import type { OrgDesign, Role } from "@/lib/types";
import { LANE_META, LANE_ORDER, isHuman } from "@/lib/lanes";
import { computeBalance, roleCost } from "@/lib/cost";

function fmt(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

// §5.6 발행 목 → 북극성③: 조직 실행계획 문서 (사업 시작 기초 문서)
export default function PublishPreview({
  design,
  onClose,
}: {
  design: OrgDesign;
  onClose: () => void;
}) {
  const b = computeBalance(design);
  const p = design.project;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        id="plan-doc"
        className="my-6 w-full max-w-2xl rounded-2xl bg-white p-8 text-slate-800 shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              조직 실행계획 문서 · workforce-architect
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{p.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{p.summary}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700 print:hidden"
          >
            ✕
          </button>
        </div>

        {/* 사업 개요 + 예산 */}
        <div className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Meta label="타겟 고객" value={p.targetCustomer} />
          <Meta label="기간" value={`${p.durationMonths}개월`} />
          <Meta label="목표매출" value={`${fmt(p.targetRevenue)}/년`} />
          <Meta
            label="인건비 합계 / 예산"
            value={`${fmt(b.total)} / ${fmt(b.budget)}`}
            danger={b.over > 0}
          />
        </div>

        {/* 레인별 역할 + 임무 */}
        {LANE_ORDER.map((lane) => {
          const roles = design.roles.filter((r) => r.lane === lane);
          if (!roles.length) return null;
          const meta = LANE_META[lane];
          return (
            <div key={lane} className="mb-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: meta.color }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                {meta.label} · {roles.length}개 역할
              </h2>
              <div className="space-y-2">
                {roles.map((r) => (
                  <RoleRow key={r.id} role={r} />
                ))}
              </div>
            </div>
          );
        })}

        {/* 발행 액션 (목) */}
        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="text-xs text-slate-400">
            ※ 실제 구인 발행(로켓펀치 POST/OAuth)은 데모 범위 밖 — 본 문서는 사업 시작 기초 문서입니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              인쇄 / PDF 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${danger ? "text-rose-600" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

function RoleRow({ role }: { role: Role }) {
  const human = isHuman(role.lane);
  const cost = roleCost(role);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{role.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{role.rationale}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-700">≈ {fmt(cost)}/년</span>
      </div>

      {/* 인간 역할: 구인 정보 (§5.6) */}
      {human && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-[11px] sm:grid-cols-4">
          <KV k="직무" v={role.jobCategoryQuery ?? "-"} />
          <KV k="시니어리티" v={role.seniority ?? "-"} />
          <KV k="근무형태" v={role.workType ?? "-"} />
          <KV k="예상연봉" v={role.estimatedAnnualSalary ? `${role.estimatedAnnualSalary.toLocaleString()}만` : "-"} />
        </div>
      )}
      {role.lane === "AI" && role.misoCapability && (
        <p className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] text-slate-500">
          <b className="text-slate-600">자동화 역량:</b> {role.misoCapability}
        </p>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-slate-400">{k}</span>
      <p className="font-medium text-slate-700">{v}</p>
    </div>
  );
}
