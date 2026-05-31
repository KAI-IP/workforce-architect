"use client";

import type { OrgDesign } from "@/lib/types";
import type { Timeline } from "@/lib/timeline";
import { computeBalance } from "@/lib/cost";
import { LANE_META } from "@/lib/lanes";

function fmt(manwon: number): string {
  if (!Number.isFinite(manwon)) return "-";
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

export default function BalanceSheet({
  design,
  timeline,
  onCompress,
  compressing = false,
}: {
  design: OrgDesign;
  timeline: Timeline;
  onCompress: () => void;
  compressing?: boolean;
}) {
  const b = computeBalance(design, timeline);
  const over = b.over > 0;
  const short = b.projectType === "SHORTTERM";
  const scale = Math.max(b.total, b.budget) * 1.08 || 1;
  const seg = (v: number) => `${(v / scale) * 100}%`;
  const budgetLeft = `${(b.budget / scale) * 100}%`;
  const unit = short ? "만원/프로젝트 전체" : "만원/년";

  const metrics = [
    { label: "AI", value: b.ai, color: LANE_META.AI.color, note: short ? "준비+운영" : "" },
    { label: "Edge", value: b.edge, color: LANE_META.EDGE.color, note: short ? "준비기간부터" : "" },
    { label: "Field", value: b.field, color: LANE_META.FIELD.color, note: short ? "운영기간만" : "" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">리소스 밸런스 시트</h2>
        <span className="text-xs text-slate-400">
          {short ? `단기 프로젝트 · 준비 ${timeline.prepWeeks}주 + 운영 ${timeline.opWeeks}주 · ` : "장기 비즈니스 · "}
          인건비 합계 vs 예산 ({unit})
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
              <span className="text-[11px] text-slate-500">{m.label}</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{fmt(m.value)}</p>
            {m.note && <p className="text-[9px] text-slate-400">{m.note}</p>}
          </div>
        ))}
        <div
          className={`rounded-lg border p-3 ${
            over ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <span className="text-[11px] text-slate-500">합계 / 예산</span>
          <p className={`mt-1 text-lg font-bold ${over ? "text-rose-600" : "text-emerald-600"}`}>
            {fmt(b.total)}
            <span className="text-xs font-normal text-slate-400"> / {fmt(b.budget)}</span>
          </p>
        </div>
      </div>

      <div className="relative h-7 w-full overflow-hidden rounded-md bg-slate-100">
        <div className="flex h-full">
          <div className="transition-[width] duration-700 ease-out" style={{ width: seg(b.ai), background: LANE_META.AI.color }} />
          <div className="transition-[width] duration-700 ease-out" style={{ width: seg(b.edge), background: LANE_META.EDGE.color }} />
          <div className="transition-[width] duration-700 ease-out" style={{ width: seg(b.field), background: LANE_META.FIELD.color }} />
        </div>
        <div
          className="absolute top-0 h-full border-l-2 border-dashed border-slate-700 transition-[left] duration-700 ease-out"
          style={{ left: budgetLeft }}
          title={`예산 ${fmt(b.budget)}`}
        >
          <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9px] font-semibold text-slate-700">
            예산 {fmt(b.budget)}
          </span>
        </div>
      </div>

      {over ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-rose-700">
            ⚠ 예산 <b>{fmt(b.over)}</b> 초과 — 공급이 얇은 역할의 업무를 AI로 이전하고 인간은 엣지
            판단으로 압축해 재설계할 수 있습니다.
          </p>
          <button
            onClick={onCompress}
            disabled={compressing}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
          >
            {compressing ? "재설계 중…" : "엣지로 압축"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs font-medium text-emerald-600">✓ 인건비 합계가 예산 이내입니다.</p>
      )}
    </div>
  );
}
