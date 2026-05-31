"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BriefForm from "@/components/BriefForm";
import OrgCanvas from "@/components/OrgCanvas";
import BalanceSheet from "@/components/BalanceSheet";
import RefinePanel from "@/components/RefinePanel";
import PublishPreview from "@/components/PublishPreview";
import NLBriefInput from "@/components/NLBriefInput";
import DeckZone from "@/components/DeckZone";
import WorkflowDeckDashboard from "@/components/WorkflowDeckDashboard";
import design from "@/lib/mocks/design.json";
import { computeBalance } from "@/lib/cost";
import { estimateTimeline, effectiveProjectType } from "@/lib/timeline";
import type { Brief, DeckCardData, OrgDesign, Persona, Role, Seniority, TeamReview } from "@/lib/types";

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

  // rank3 카드덱
  const [deck, setDeck] = useState<DeckCardData[]>([]);
  const [review, setReview] = useState<TeamReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeline = useMemo(
    () => estimateTimeline(orgDesign.project, Math.min(8, Math.max(3, orgDesign.roles.length))),
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

  // rank3 핸들러
  function addToDeck(roleId: string, persona: Persona) {
    setDeck((d) => [...d, { instanceId: `${roleId}-${d.length}-${persona.label}`, roleId, persona }]);
  }
  function removeFromDeck(instanceId: string) {
    setDeck((d) => d.filter((c) => c.instanceId !== instanceId));
  }
  function setHeadcount(roleId: string, n: number) {
    updateRole(roleId, { headcount: n });
  }
  function acceptSuggestion(s: TeamReview["suggestions"][number]) {
    if (s.kind === "ADD_HEADCOUNT") updateRole(s.roleId, { headcount: Number(s.target) || 2 });
    else if (s.kind === "RAISE_SENIORITY") updateRole(s.roleId, { seniority: s.target as Seniority });
    else if (s.kind === "COVER_BY_AI")
      refine("공급이 얇거나 신입 단독인 역할의 업무 일부를 AI로 이전해 재설계하라. JSON만 출력.");
  }

  // 덱/역할 변화 → team-review (디바운스)
  useEffect(() => {
    if (deck.length < 2) {
      setReview(null);
      return;
    }
    if (reviewTimer.current) clearTimeout(reviewTimer.current);
    setReviewing(true);
    reviewTimer.current = setTimeout(async () => {
      const cards = deck.map((c) => {
        const r = orgDesign.roles.find((x) => x.id === c.roleId);
        return {
          roleId: c.roleId,
          title: r?.title ?? c.roleId,
          lane: r?.lane ?? "EDGE",
          seniority: r?.seniority,
          headcount: r?.headcount ?? 1,
          personaLabel: c.persona.label,
          jobCategoryQuery: r?.jobCategoryQuery,
        };
      });
      try {
        const res = await fetch("/api/team-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: orgDesign.project, cards, conversationId }),
        });
        const json = await res.json();
        setReview(json.review ?? null);
      } catch {
        setReview(null);
      } finally {
        setReviewing(false);
      }
    }, 600);
    return () => {
      if (reviewTimer.current) clearTimeout(reviewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, orgDesign]);

  async function refine(instruction: string) {
    setCompressing(true);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orgDesign.project, instruction, conversationId }),
      });
      const json = await res.json();
      if (json.design) {
        setOrgDesign(json.design as OrgDesign);
        setDeck([]);
        setReview(null);
      }
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
    setDeck([]);
    setReview(null);
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
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">workforce-architect</p>
        <h1 className="mt-1.5 text-3xl font-bold text-slate-900">하이브리드 조직 설계 시뮬레이터</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          사업 브리프를 입력하면 “지능은 시스템에, 사람은 엣지에” 원리로 일을 AI / 인간-Edge / 인간-Field
          3영역으로 분해하고, 각 역할의 비용·페르소나·임무까지 도출합니다.
        </p>
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
                <span className="text-amber-600">⚠ 목(mock) 설계로 표시 중 — MISO 키 연결 시 실 API.</span>
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
                : `${orgDesign.roles.length}개 역할 · ${projectType === "SHORTTERM" ? "단기 프로젝트" : "장기 비즈니스"}`}
            </span>
          </div>
          <OrgCanvas
            design={orgDesign}
            timeline={timeline}
            loading={loading}
            onRoleUpdate={updateRole}
            onAddToDeck={addToDeck}
          />
          <p className="pt-1 text-xs text-slate-400">
            인간 카드 클릭 → 페르소나에서 [덱에 추가]. “시장 N건”은 로켓펀치 공급량 (
            <span className="text-slate-500">*</span> = API 미응답 시 목).
          </p>
        </section>
      </div>

      {/* rank3: 운영 덱 */}
      <section className="mt-8">
        <DeckZone
          deck={deck}
          roles={orgDesign.roles}
          project={orgDesign.project}
          review={review}
          reviewing={reviewing}
          onRemove={removeFromDeck}
          onHeadcount={setHeadcount}
          onAccept={acceptSuggestion}
        />
      </section>

      {/* P7 밸런스 + P8 순환 수정 */}
      <section className="mt-8 space-y-4">
        <BalanceSheet design={orgDesign} timeline={timeline} onCompress={handleCompress} compressing={compressing} />
        <RefinePanel onRefine={refine} busy={compressing} />
      </section>

      {/* rank4: 워크플로우 덱 대시보드 */}
      <section className="mt-8">
        <WorkflowDeckDashboard design={orgDesign} onOpenPublish={() => setPublishOpen(true)} />
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        비용·연봉은 NCS·공개 노동통계 기반 PoC 가정값(재무자문 아님). 인간 역할은 로켓펀치 공급량으로 검증하며,
        AI/미션은 MISO로 실제 실행됩니다. 외부 API 미응답 시 목 데이터로 graceful fallback.
      </footer>
    </main>
  );
}
