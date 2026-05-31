"use client";

import { useState } from "react";
import type { Brief, OrgDesign, Role } from "@/lib/types";
import type { Timeline } from "@/lib/timeline";
import { LANE_META, LANE_ORDER, isHuman } from "@/lib/lanes";
import { computeBalance, roleProjectCost, effectiveWindow } from "@/lib/cost";
import { buildTimeframe } from "@/lib/timeframe";
import { toSkillMd } from "@/lib/skillmd";

const WINDOW_KO: Record<string, string> = { both: "준비+운영", operation: "운영만", prep: "준비만" };

function fmt(manwon: number): string {
  if (!Number.isFinite(manwon)) return "-";
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

interface Mission {
  objective?: string;
  tasks?: string[];
  deliverables?: string[];
  kpi?: string[];
  sampleOutput?: string;
}

// §5.6 발행 목 → 북극성③: 조직 실행계획 문서 (사업 시작 기초 문서)
export default function PublishPreview({
  design,
  timeline,
  onClose,
}: {
  design: OrgDesign;
  timeline: Timeline;
  onClose: () => void;
}) {
  const b = computeBalance(design, timeline);
  const p = design.project;
  const short = b.projectType === "SHORTTERM";
  const tf = buildTimeframe(design);

  function downloadSkillMd() {
    const md = toSkillMd(design, missions);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.project.title.replace(/\s+/g, "_")}_SKILL.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const [missions, setMissions] = useState<Record<string, Mission>>({});
  const [generating, setGenerating] = useState(false);
  const allDone = design.roles.every((r) => missions[r.id]);

  async function generateAll() {
    setGenerating(true);
    try {
      const results = await Promise.all(
        design.roles.map((r) =>
          fetch("/api/run-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: r, project: p }),
          })
            .then((res) => res.json())
            .then((j) => [r.id, j.output as Mission] as const)
            .catch(() => [r.id, {} as Mission] as const),
        ),
      );
      setMissions(Object.fromEntries(results));
    } finally {
      setGenerating(false);
    }
  }

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
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              조직 실행계획 문서 · workforce-architect
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{p.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{p.summary}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 print:hidden">
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Meta label="타겟 고객" value={p.targetCustomer} />
          <Meta
            label="기간"
            value={short ? `준비 ${timeline.prepWeeks}주 + 운영 ${timeline.opWeeks}주` : `${p.durationMonths}개월`}
          />
          <Meta label="목표매출" value={`${fmt(p.targetRevenue)}/년`} />
          <Meta label="인건비 / 예산" value={`${fmt(b.total)} / ${fmt(b.budget)}`} danger={b.over > 0} />
        </div>

        {/* 전체 미션 생성 액션 */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 print:hidden">
          <p className="text-xs text-slate-500">
            {allDone
              ? "✓ 전 역할 미션 도출 완료 — 이 문서로 사업을 시작할 수 있습니다."
              : "각 역할의 실행 미션(목표·태스크·산출물·KPI)을 한 번에 도출합니다."}
          </p>
          <button
            onClick={generateAll}
            disabled={generating}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {generating ? "도출 중…" : allDone ? "다시 생성" : "전체 미션 생성"}
          </button>
        </div>

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
                  <RoleRow
                    key={r.id}
                    role={r}
                    project={p}
                    timeline={timeline}
                    short={short}
                    mission={missions[r.id]}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* 타임프레임 — 당사자별 개월 마일스톤 (PDF 포함) */}
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-slate-800">타임프레임 — {tf.monthCount}개월 시행계획</h2>
          <div className="space-y-1.5">
            {tf.rows.map((r) => (
              <div key={r.roleId} className="rounded-lg border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-700">{r.title}</p>
                <div className="mt-1 grid gap-1 text-[10px] text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
                  {r.months.map((m, i) => (
                    <span key={i}>
                      <b className="text-slate-600">{i + 1}M</b> {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="text-xs text-slate-400">
            ※ 실제 구인 발행은 데모 범위 밖 — 본 문서는 사업 시작 기초 문서입니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadSkillMd}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="Tower Standalone(Apache-2.0) 호환 SKILL.md"
            >
              SKILL.md 내보내기
            </button>
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
      <p className={`mt-0.5 text-sm font-semibold ${danger ? "text-rose-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function RoleRow({
  role,
  project,
  timeline,
  short,
  mission,
}: {
  role: Role;
  project: Brief;
  timeline: Timeline;
  short: boolean;
  mission?: Mission;
}) {
  const human = isHuman(role.lane);
  const cost = roleProjectCost(role, project, timeline);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{role.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{role.rationale}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-700">
          ≈ {fmt(cost)}
          {short ? "" : "/년"}
        </span>
      </div>

      {human && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-[11px] sm:grid-cols-4">
          <KV k="직무" v={role.jobCategoryQuery ?? "-"} />
          <KV k="시니어리티" v={role.seniority ?? "-"} />
          <KV k={short ? "고용구간" : "근무형태"} v={short ? WINDOW_KO[effectiveWindow(role)] : role.workType ?? "-"} />
          <KV k="예상연봉" v={role.estimatedAnnualSalary ? `${role.estimatedAnnualSalary.toLocaleString()}만` : "-"} />
        </div>
      )}

      {/* 미션 (전체 생성 시 임베드) */}
      {mission && (mission.objective || mission.tasks?.length) && (
        <div className="mt-2 space-y-1.5 rounded-md border border-indigo-100 bg-indigo-50/60 p-2.5 text-[11px]">
          {mission.objective && (
            <p className="text-slate-700">
              <b className="text-indigo-700">목표</b> · {mission.objective}
            </p>
          )}
          {!!mission.tasks?.length && (
            <p className="text-slate-600">
              <b className="text-indigo-700">태스크</b> · {mission.tasks.join(" → ")}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            {!!mission.deliverables?.length && (
              <span>
                <b className="text-indigo-700">산출물</b> · {mission.deliverables.join(", ")}
              </span>
            )}
            {!!mission.kpi?.length && (
              <span>
                <b className="text-indigo-700">KPI</b> · {mission.kpi.join(", ")}
              </span>
            )}
          </div>
          {mission.sampleOutput && (
            <p className="text-slate-500">
              <b className="text-indigo-700">샘플</b> · {mission.sampleOutput}
            </p>
          )}
        </div>
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
