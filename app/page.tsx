"use client";

import { useMemo, useState } from "react";
import BriefForm from "@/components/BriefForm";
import OrgCanvas from "@/components/OrgCanvas";
import BalanceSheet from "@/components/BalanceSheet";
import RefinePanel from "@/components/RefinePanel";
import PublishPreview from "@/components/PublishPreview";
import NLBriefInput from "@/components/NLBriefInput";
import design from "@/lib/mocks/design.json";
import { computeBalance } from "@/lib/cost";
import { estimateTimeline, effectiveProjectType } from "@/lib/timeline";
import type { Brief, OrgDesign, Role } from "@/lib/types";

const mock = design as OrgDesign;

export default function Home() {
  const [orgDesign, setOrgDesign] = useState<OrgDesign>(mock);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [designed, setDesigned] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Brief>(mock.project);
  const [formKey, setFormKey] = useState(0);

  // rank1: 타임라인(준비/운영 주수) — stageCount는 역할 수로 근사(지식 클라번들 회피)
  const timeline = useMemo(
    () =>
      estimateTimeline(
        orgDesign.project,
        Math.min(8, Math.max(3, orgDesign.roles.length)),
      ),
    [orgDesign],
  );
  const projectType = effectiveProjectType(orgDesign.project);

  function handleParsed(brief: Brief) {
    setFormInitial(brief);
    setFormKey((k) => k + 1);
  }

  function updateRole(roleId: string, patch: Partial<Role>) {
    setOrgDesign((d) => ({
      ...d,
      roles: d.roles.map((r) => (r.id === roleId ? { ...r, ...patch } : r)),
    }));
  }

  async function refine(instruction: string) {
    setCompressing(true);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orgDesign.project, instruction, conversationId }),
      });
      const json = await res.json();
      if (json.design) setOrgDesign(json.design as OrgDesign);
      setDegraded(Boolean(json.degraded));
      setConversationId(json.conversationId ?? conversationId);
    } catch (e) {
      console.error("[refine] failed", e);
    } finally {
      setCompressing(false);
    }
  }

  function handleCompress() {
    const bal = computeBalance(orgDesign, timeline);
    return refine(
      `현재 인건비 합계가 예산을 ${bal.over}만원 초과한다(합계 ${bal.total}만, 예산 ${bal.budget}만). ` +
        `공급이 얇거나 자동화 가능한 역할의 업무 일부를 AI로 이전하고, 인간 역할은 엣지 판단 중심으로 ` +
        `축소·통합해 인건비 합계가 예산 이내로 들어오게 재설계하라. 지침의 JSON 스키마만 출력.`,
    );
  }

  async function handleDesign(b: Brief) {
    setLoading(true);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, conversationId }),
      });
      const json = await res.json();
      if (json.design) setOrgDesign(json.design as OrgDesign);
      setDegraded(Boolean(json.degraded));
      setConversationId(json.conversationId ?? null);
      setDesigned(true);
    } catch (e) {
      console.error("[architect] failed", e);
      setDegraded(true);
      setDesigned(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            workforce-architect
          </p>
          <h1 className="mt-1.5 text-3xl font-bold text-slate-900">
            하이브리드 조직 설계 시뮬레이터
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            사업 브리프를 입력하면 “지능은 시스템에, 사람은 엣지에” 원리로 일을 AI / 인간-Edge /
            인간-Field 3영역으로 분해하고, 각 역할의 비용·페르소나·임무까지 도출합니다.
          </p>
        </div>
        <button
          onClick={() => setPublishOpen(true)}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          📄 실행계획 문서
        </button>
      </header>

      {publishOpen && (
        <PublishPreview design={orgDesign} timeline={timeline} onClose={() => setPublishOpen(false)} />
      )}

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">사업 브리프</h2>
          <NLBriefInput onParsed={handleParsed} />
          <BriefForm key={formKey} initial={formInitial} onSubmit={handleDesign} loading={loading} />
          {designed && (
            <p className="mt-3 text-xs">
              {degraded ? (
                <span className="text-amber-600">
                  ⚠ 목(mock) 설계로 표시 중 — MISO 키 연결 시 실 API로 전환됩니다.
                </span>
              ) : (
                <span className="font-medium text-emerald-600">✓ MISO 아키텍트 실 응답으로 설계됨.</span>
              )}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">조직 캔버스</h2>
            <span className="text-xs text-slate-400">
              {loading
                ? "분석 중…"
                : `${orgDesign.project.title} · ${orgDesign.roles.length}개 역할 · ${
                    projectType === "SHORTTERM" ? "단기 프로젝트" : "장기 비즈니스"
                  }`}
            </span>
          </div>
          <OrgCanvas
            design={orgDesign}
            timeline={timeline}
            loading={loading}
            onRoleUpdate={updateRole}
          />
          <p className="pt-1 text-xs text-slate-400">
            인간 카드 클릭 → 페르소나·시장근거. “시장 N건”은 로켓펀치 공급량 (
            <span className="text-slate-500">*</span> = API 미응답 시 목).
          </p>
        </section>
      </div>

      <section className="mt-8 space-y-4">
        <BalanceSheet
          design={orgDesign}
          timeline={timeline}
          onCompress={handleCompress}
          compressing={compressing}
        />
        <RefinePanel onRefine={refine} busy={compressing} />
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        비용·연봉은 NCS·공개 노동통계 기반 PoC 가정값(재무자문 아님). 인간 역할은 로켓펀치 공급량으로
        검증하며, AI/미션은 MISO로 실제 실행됩니다. 외부 API 미응답 시 목 데이터로 graceful fallback.
      </footer>
    </main>
  );
}
