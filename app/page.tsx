"use client";

import { useState } from "react";
import BriefForm from "@/components/BriefForm";
import OrgCanvas from "@/components/OrgCanvas";
import BalanceSheet from "@/components/BalanceSheet";
import RefinePanel from "@/components/RefinePanel";
import design from "@/lib/mocks/design.json";
import { computeBalance } from "@/lib/cost";
import type { Brief, OrgDesign, Role } from "@/lib/types";

const mock = design as OrgDesign;

export default function Home() {
  const [orgDesign, setOrgDesign] = useState<OrgDesign>(mock);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [designed, setDesigned] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // P6: 페르소나 팝오버의 시니어리티 조절 → 역할 패치 → 비용·밸런스 즉시 갱신
  function updateRole(roleId: string, patch: Partial<Role>) {
    setOrgDesign((d) => ({
      ...d,
      roles: d.roles.map((r) => (r.id === roleId ? { ...r, ...patch } : r)),
    }));
  }

  // §5.4 + 북극성② — 아키텍트 재호출(순환 수정). conversationId 유지로 직전 설계 맥락 계승.
  async function refine(instruction: string) {
    setCompressing(true);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orgDesign.project, instruction, conversationId }),
      });
      const json = await res.json();
      console.log("[refine] response =", json);
      if (json.design) setOrgDesign(json.design as OrgDesign);
      setDegraded(Boolean(json.degraded));
      setConversationId(json.conversationId ?? conversationId);
    } catch (e) {
      console.error("[refine] failed", e);
    } finally {
      setCompressing(false);
    }
  }

  // [엣지로 압축] — refine 의 예산 압축 프리셋
  function handleCompress() {
    const bal = computeBalance(orgDesign);
    return refine(
      `현재 인건비 합계가 예산을 ${bal.over}만원 초과한다(합계 ${bal.total}만, 예산 ${bal.budget}만). ` +
        `공급이 얇거나 자동화 가능한 역할의 업무 일부를 AI로 이전하고, 인간 역할은 엣지 판단 중심으로 ` +
        `축소·통합해 인건비 합계가 예산 이내로 들어오게 재설계하라. 지침의 JSON 스키마만 출력.`,
    );
  }

  async function handleDesign(b: Brief) {
    console.log("[BriefForm] Brief =", b);
    setLoading(true);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, conversationId }),
      });
      const json = await res.json();
      console.log("[architect] response =", json);
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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          workforce-architect · 7h PoC
        </p>
        <h1 className="mt-2 text-3xl font-bold">가상 하이브리드 조직 설계 시뮬레이터</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          사업 브리프를 입력하면 “지능은 시스템에, 사람은 엣지에” 원리로 일을 AI / 인간-Edge /
          인간-Field 3영역으로 분해합니다.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* 좌측: 브리프 폼 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white/80">사업 브리프</h2>
          <BriefForm initial={orgDesign.project} onSubmit={handleDesign} loading={loading} />
          {designed && (
            <p className="mt-3 text-xs">
              {degraded ? (
                <span className="text-amber-400">
                  ⚠ 목(mock) 설계로 표시 중 — MISO 키 연결 시 실 API로 전환됩니다.
                </span>
              ) : (
                <span className="text-lane-ai">✓ MISO 아키텍트 실 응답으로 설계됨.</span>
              )}
            </p>
          )}
        </section>

        {/* 우측: 조직 캔버스 (P4) + 공급 배지 (P5) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80">조직 캔버스</h2>
            <span className="text-xs text-white/30">
              {loading ? "분석 중…" : `${orgDesign.project.title} · ${orgDesign.roles.length}개 역할`}
            </span>
          </div>
          <OrgCanvas design={orgDesign} loading={loading} onRoleUpdate={updateRole} />
          <p className="pt-1 text-xs text-white/30">
            인간 카드 클릭 → 페르소나·시장근거. “시장 N건”은 로켓펀치 공급량 (
            <span className="text-white/40">*</span> = API 미응답 시 목).
          </p>
        </section>
      </div>

      {/* P7: 리소스 밸런스 시트 + P8: 순환 수정 (전체 폭) */}
      <section className="mt-8 space-y-4">
        <BalanceSheet design={orgDesign} onCompress={handleCompress} compressing={compressing} />
        <RefinePanel onRefine={refine} busy={compressing} />
      </section>
    </main>
  );
}
