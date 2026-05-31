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
      <p className="mb-3 text-[11px] text-slate-400">
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 print:bg-white print:p-0"
          onClick={() => setIrOpen(false)}
        >
          <div
            className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl print:my-0 print:rounded-none print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 히어로 */}
            <div className="relative bg-gradient-to-br from-violet-600 to-teal-500 px-8 py-7 text-white">
              <button onClick={() => setIrOpen(false)} className="absolute right-4 top-4 text-white/70 hover:text-white print:hidden">✕</button>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Investor Relations · Pitch</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight">{p.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">{p.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">🎯 {p.targetCustomer}</span>
                <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">🤖 AI {aiCount}개 자동화</span>
                <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">💸 인건비율 {laborRatio}%</span>
              </div>
            </div>

            <div className="px-8 py-6">
              {/* 재무 스냅샷 */}
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <IrMetric k="목표매출" v={`${fmt(p.targetRevenue)}/년`} />
                <IrMetric k="연 인건비" v={fmt(b.total)} />
                <IrMetric k="인건비율" v={`${laborRatio}%`} />
                <IrMetric k="조직 규모" v={`${design.roles.length}역할`} />
              </div>

              {/* 왜 매력적인가 */}
              <h2 className="mt-6 mb-2 text-sm font-bold text-slate-900">왜 이 사업이 매력적인가</h2>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>✅ AI {aiCount}개 역할이 반복 운영을 자동화하는 <b>AI-NATIVE 린 조직</b> — 같은 매출을 더 적은 인건비로 (인건비율 {laborRatio}%).</li>
                <li>✅ 사람은 윤리·신뢰·전문판단·현장 등 <b>대체 불가한 엣지 업무에만</b> 투입 → 자원 낭비 최소화, 빠른 손익분기.</li>
                <li>✅ NCS 국가직무표준·로켓펀치 실시간 채용시장으로 <b>검증된, 즉시 실행 가능한</b> 인력 구조.</li>
                <li>✅ 사람을 뽑기 전에 각자의 임무·KPI가 적힌 <b>실행계획 문서</b>가 이미 완성 — 투자금이 곧바로 실행으로.</li>
              </ul>

              {/* 운영 인력 구성 */}
              <h2 className="mt-6 mb-2 text-sm font-bold text-slate-900">운영 인력 구성</h2>
              <div className="space-y-2">
                {(["EDGE", "FIELD", "AI"] as const).map((l) => {
                  const rs = design.roles.filter((r) => r.lane === l);
                  if (!rs.length) return null;
                  return (
                    <div key={l} className="rounded-lg border border-slate-200 p-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: LANE_META[l].color }} />
                          {LANE_META[l].label} · {rs.length}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {fmt(l === "AI" ? b.ai : l === "EDGE" ? b.edge : b.field)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{rs.map((r) => r.title).join(" · ")}</p>
                    </div>
                  );
                })}
              </div>

              {/* 자금 조달 제안 */}
              <h2 className="mt-6 mb-2 text-sm font-bold text-slate-900">자금 조달 제안</h2>
              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                <div className="rounded-lg bg-teal-50 p-2.5 text-teal-800">
                  <b>운영자금 대출 (고위드)</b> — 초기 인건비·보증금 약 {fmt(b.total)} 확보
                </div>
                <div className="rounded-lg bg-violet-50 p-2.5 text-violet-800">
                  <b>크라우드펀딩 (로켓펀치)</b> — AI-NATIVE 스토리로 투자자 모집
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400">Workforce Architect 자동 생성 · PoC 가정값</p>
                <button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 print:hidden">
                  인쇄 / PDF 저장
                </button>
              </div>
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
