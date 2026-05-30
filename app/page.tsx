"use client";

import { useState } from "react";
import BriefForm from "@/components/BriefForm";
import OrgCanvas from "@/components/OrgCanvas";
import design from "@/lib/mocks/design.json";
import type { Brief, OrgDesign, Role } from "@/lib/types";

const mock = design as OrgDesign;

export default function Home() {
  const [orgDesign, setOrgDesign] = useState<OrgDesign>(mock);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [designed, setDesigned] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // P6: 페르소나 팝오버의 시니어리티 조절 → 역할 패치 → 비용·밸런스 즉시 갱신
  function updateRole(roleId: string, patch: Partial<Role>) {
    setOrgDesign((d) => ({
      ...d,
      roles: d.roles.map((r) => (r.id === roleId ? { ...r, ...patch } : r)),
    }));
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
            인간 카드의 “시장 N건”은 로켓펀치 공급량입니다. (
            <span className="text-white/40">*</span> = 로켓펀치 API 미응답 시 목 데이터)
            다음 단계(P6~): 페르소나 팝오버 → 비용·밸런스 시트.
          </p>
        </section>
      </div>
    </main>
  );
}
