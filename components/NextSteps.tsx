"use client";

import { useState } from "react";
import type { OrgDesign } from "@/lib/types";
import type { Timeline } from "@/lib/timeline";
import { computeBalance } from "@/lib/cost";
import { LANE_META } from "@/lib/lanes";

function fmt(m: number): string {
  if (!Number.isFinite(m)) return "-";
  return m >= 10000 ? `${(m / 10000) % 1 === 0 ? m / 10000 : (m / 10000).toFixed(1)}억` : `${m.toLocaleString()}만`;
}

export default function NextSteps({ design, timeline }: { design: OrgDesign; timeline: Timeline }) {
  const b = computeBalance(design, timeline);
  const p = design.project;
  const laborRatio = p.targetRevenue ? Math.round((b.total / p.targetRevenue) * 100) : 0;
  const aiCount = design.roles.filter((r) => r.lane === "AI").length;
  const [irOpen, setIrOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">다음 단계 — 사업 추진 연결</h2>
      <p className="mt-0.5 mb-3 text-[11px] text-slate-400">
        인력 비용 구조가 산출되어 대략적 사업 규모·매출 수준을 예측할 수 있습니다. 자금·투자 단계로 연결하세요.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="https://www.gowid.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">대출 예측 — 고위드 ↗</span>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">자금</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            🤖 AI 의견: 초기 인건비 약 <b>{fmt(b.total)}</b>·보증금 확보를 위한 운영자금 대출을 안내드립니다.
          </p>
        </a>

        <a
          href="https://www.rocketpunch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">크라우드펀딩·투자자 모집 — 로켓펀치 ↗</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">투자</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            🤖 AI 의견: 목표매출 <b>{fmt(p.targetRevenue)}</b>·AI 자동화 {aiCount}개 역할 등 매력 포인트가 있어
            IR 발행 후 펀딩 진행을 제안합니다.
          </p>
        </a>
      </div>

      <button
        onClick={() => setIrOpen(true)}
        className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        IR 소개서 발행
      </button>

      {irOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 print:bg-white print:p-0"
          onClick={() => setIrOpen(false)}
        >
          <div
            className="my-6 w-full max-w-xl rounded-2xl bg-white p-8 text-slate-800 shadow-2xl print:my-0 print:rounded-none print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Investor Relations · 1-pager</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{p.title}</h1>
              </div>
              <button onClick={() => setIrOpen(false)} className="text-slate-400 hover:text-slate-700 print:hidden">✕</button>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{p.summary}</p>
            <p className="mt-1 text-xs text-slate-400">타겟 고객 — {p.targetCustomer}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <IrMetric k="목표매출" v={`${fmt(p.targetRevenue)}/년`} />
              <IrMetric k="인건비" v={fmt(b.total)} />
              <IrMetric k="인건비율" v={`${laborRatio}%`} />
              <IrMetric k="조직" v={`${design.roles.length}역할 (AI ${aiCount})`} />
            </div>

            <h2 className="mt-5 mb-1.5 text-sm font-bold text-slate-800">투자 포인트</h2>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>· AI {aiCount}개 역할로 운영을 자동화한 <b>AI-NATIVE 린 조직</b> (인건비율 {laborRatio}%)</li>
              <li>· 사람은 윤리·신뢰·현장 등 <b>엣지/체화 업무에만</b> 집중 → 자원 낭비 최소화</li>
              <li>· NCS·로켓펀치 시장 데이터로 검증된 <b>실현 가능한 인력 구조</b></li>
            </ul>

            <h2 className="mt-5 mb-1.5 text-sm font-bold text-slate-800">비용 구조</h2>
            <div className="space-y-1 text-xs">
              {(["AI", "EDGE", "FIELD"] as const).map((l) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: LANE_META[l].color }} />
                    {LANE_META[l].label}
                  </span>
                  <span className="font-medium text-slate-700">{fmt(l === "AI" ? b.ai : l === "EDGE" ? b.edge : b.field)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-3 print:hidden">
              <button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                인쇄 / PDF 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IrMetric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[10px] text-slate-400">{k}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{v}</p>
    </div>
  );
}
