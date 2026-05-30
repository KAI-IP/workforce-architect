"use client";

import type { OrgDesign } from "@/lib/types";
import { computeBalance } from "@/lib/cost";
import { LANE_META } from "@/lib/lanes";

// 만원 → 보기 좋은 한글 단위
function fmt(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

export default function BalanceSheet({
  design,
  onCompress,
  compressing = false,
}: {
  design: OrgDesign;
  onCompress: () => void;
  compressing?: boolean;
}) {
  const b = computeBalance(design);
  const over = b.over > 0;
  const scale = Math.max(b.total, b.budget) * 1.08 || 1;
  const seg = (v: number) => `${(v / scale) * 100}%`;
  const budgetLeft = `${(b.budget / scale) * 100}%`;

  const metrics = [
    { label: "AI", value: b.ai, color: LANE_META.AI.color },
    { label: "Edge", value: b.edge, color: LANE_META.EDGE.color },
    { label: "Field", value: b.field, color: LANE_META.FIELD.color },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">리소스 밸런스 시트</h2>
        <span className="text-xs text-white/40">인건비 합계 vs 예산 (만원/년)</span>
      </div>

      {/* metric 4 */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
              <span className="text-[11px] text-white/50">{m.label}</span>
            </div>
            <p className="mt-1 text-lg font-bold text-white/90">{fmt(m.value)}</p>
          </div>
        ))}
        <div
          className={`rounded-lg border p-3 ${
            over ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <span className="text-[11px] text-white/50">합계 / 예산</span>
          <p className={`mt-1 text-lg font-bold ${over ? "text-rose-300" : "text-emerald-300"}`}>
            {fmt(b.total)}
            <span className="text-xs font-normal text-white/40"> / {fmt(b.budget)}</span>
          </p>
        </div>
      </div>

      {/* 스택 막대 + 예산선 */}
      <div className="relative h-7 w-full overflow-hidden rounded-md bg-white/5">
        <div className="flex h-full">
          <div style={{ width: seg(b.ai), background: LANE_META.AI.color }} />
          <div style={{ width: seg(b.edge), background: LANE_META.EDGE.color }} />
          <div style={{ width: seg(b.field), background: LANE_META.FIELD.color }} />
        </div>
        {/* 예산선 마커 */}
        <div
          className="absolute top-0 h-full border-l-2 border-dashed border-white"
          style={{ left: budgetLeft }}
          title={`예산 ${fmt(b.budget)}`}
        >
          <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9px] font-semibold text-white">
            예산 {fmt(b.budget)}
          </span>
        </div>
      </div>

      {/* 초과 배너 + 엣지로 압축 */}
      {over ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-rose-200">
            ⚠ 예산 <b>{fmt(b.over)}</b> 초과 — 공급이 얇은 역할의 업무를 AI로 이전하고 인간은 엣지
            판단으로 압축해 재설계할 수 있습니다.
          </p>
          <button
            onClick={onCompress}
            disabled={compressing}
            className="shrink-0 rounded-lg bg-lane-edge px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {compressing ? "재설계 중…" : "엣지로 압축"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-emerald-300/80">✓ 인건비 합계가 예산 이내입니다.</p>
      )}
    </div>
  );
}
