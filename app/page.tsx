"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BriefForm from "@/components/BriefForm";
import OrgCanvas from "@/components/OrgCanvas";
import BalanceSheet from "@/components/BalanceSheet";
import RefinePanel from "@/components/RefinePanel";
import PublishPreview from "@/components/PublishPreview";
import NLBriefInput from "@/components/NLBriefInput";
import ClarifyStep from "@/components/ClarifyStep";
import type { ClarifyQuestion } from "@/app/api/clarify/route";
import DeckZone from "@/components/DeckZone";
import WorkflowDeckDashboard from "@/components/WorkflowDeckDashboard";
import TimeframeDashboard from "@/components/TimeframeDashboard";
import NextSteps from "@/components/NextSteps";
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

  // ①-b AI 질문 플로우
  const [pendingBrief, setPendingBrief] = useState<Brief | null>(null);
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyDegraded, setClarifyDegraded] = useState(false);
  const [clarifyOpen, setClarifyOpen] = useState(false);

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

  async function refine(userInstruction: string) {
    setCompressing(true);
    const current = orgDesign.roles
      .map((r) => `${r.title}[${r.lane}${r.jobCategoryQuery ? "/직군:" + r.jobCategoryQuery : ""}]`)
      .join(", ");
    const instruction =
      `[현재 설계 역할] ${current}\n[수정 지시] ${userInstruction}\n` +
      `위 수정 지시를 반드시 반영해 조직을 처음부터 재설계하라. 특히 직군(jobCategoryQuery)이 사업 본질과 ` +
      `맞지 않으면 지시대로 정확히 교체하라(틀린 직군을 유지하지 마라). 지침의 JSON 스키마만 출력.`;
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

  // ①-b: [설계하기] → 먼저 AI 객관식 질문
  async function startClarify(b: Brief) {
    setPendingBrief(b);
    setClarifyOpen(true);
    setClarifyLoading(true);
    setClarifyQuestions([]);
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const json = await res.json();
      setClarifyQuestions(json.questions ?? []);
      setClarifyDegraded(Boolean(json.degraded));
    } catch {
      setClarifyQuestions([]);
      setClarifyDegraded(true);
    } finally {
      setClarifyLoading(false);
    }
  }

  function confirmClarify(context: string) {
    setClarifyOpen(false);
    if (pendingBrief) handleDesign(pendingBrief, context);
  }
  function skipClarify() {
    setClarifyOpen(false);
    if (pendingBrief) handleDesign(pendingBrief);
  }

  async function handleDesign(b: Brief, clarifyContext?: string) {
    setLoading(true);
    setDeck([]);
    setReview(null);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, clarifyContext, conversationId }),
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

      {/* STEP 1 — 사업 브리프 (상하 flow) */}
      <section className="mx-auto max-w-3xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">1</span>
          <h2 className="text-sm font-semibold text-slate-700">사업 브리프</h2>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          자연어로 사업을 설명하면 AI가 폼을 채웁니다. 기간으로 장기 비즈니스/단기 프로젝트를 자동 분류합니다.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <NLBriefInput onParsed={handleParsed} />
          <BriefForm key={formKey} initial={formInitial} onSubmit={startClarify} loading={loading} />
          {designed && (
            <p className="mt-3 text-xs">
              {degraded ? (
                <span className="text-amber-600">⚠ 목(mock) 설계로 표시 중 — MISO 키 연결 시 실 API.</span>
              ) : (
                <span className="font-medium text-emerald-600">✓ MISO 아키텍트 실 응답으로 설계됨.</span>
              )}
            </p>
          )}
        </div>
      </section>

      {/* STEP 1.5 — AI 질문 (설계 전 직군 모호함 제거) */}
      {clarifyOpen && (
        <>
          <FlowArrow />
          <section className="mx-auto max-w-3xl">
            <ClarifyStep
              questions={clarifyQuestions}
              loading={clarifyLoading}
              degraded={clarifyDegraded}
              onConfirm={confirmClarify}
              onSkip={skipClarify}
            />
          </section>
        </>
      )}

      <FlowArrow />

      {/* STEP 2 — 조직 캔버스 */}
      <section>
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">2</span>
          <h2 className="text-sm font-semibold text-slate-700">조직 캔버스</h2>
          <span className="ml-auto text-xs text-slate-400">
            {loading ? "분석 중…" : `${orgDesign.roles.length}개 역할 · ${projectType === "SHORTTERM" ? "단기 프로젝트" : "장기 비즈니스"}`}
          </span>
        </div>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          AI-NATIVE 프로젝트 수행을 위하여 주체별로 다음과 같은 업무를 수행할 수 있습니다. 각 직군의 후보자들을
          제안드리며, 적합한 인원을 Deck으로 추가하여 사업 운영 방향을 시뮬레이션 하세요.
        </p>
        <OrgCanvas
          design={orgDesign}
          timeline={timeline}
          loading={loading}
          onRoleUpdate={updateRole}
          onAddToDeck={addToDeck}
        />
      </section>

      <FlowArrow />

      {/* STEP 3 — 운영 덱 */}
      <section>
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">3</span>
          <h2 className="text-sm font-semibold text-slate-700">운영 덱 시뮬레이션</h2>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          후보를 덱에 배치하면 AI가 이 조합으로 사업이 운영 가능한지(인원·경력·역량) 평가합니다.
        </p>
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

      <FlowArrow />

      {/* STEP 4 — 밸런스 + 순환 수정 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">4</span>
          <h2 className="text-sm font-semibold text-slate-700">비용 검토 · 순환 수정</h2>
        </div>
        <BalanceSheet design={orgDesign} timeline={timeline} onCompress={handleCompress} compressing={compressing} />
        <RefinePanel onRefine={refine} busy={compressing} />
      </section>

      <FlowArrow />

      {/* STEP 5 — 워크플로우 덱: 조직 + 타임프레임 대시보드 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">5</span>
          <h2 className="text-sm font-semibold text-slate-700">워크플로우 덱</h2>
        </div>
        <WorkflowDeckDashboard design={orgDesign} onOpenPublish={() => setPublishOpen(true)} />
        <TimeframeDashboard design={orgDesign} />
      </section>

      <FlowArrow />

      {/* STEP 6 — 다음 단계 사업 추진 연결 (맨 마지막) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">6</span>
          <h2 className="text-sm font-semibold text-slate-700">다음 단계 — 사업 추진 연결</h2>
        </div>
        <NextSteps design={orgDesign} timeline={timeline} />
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        <p>
          비용·연봉은 NCS·공개 노동통계 기반 PoC 가정값(재무자문 아님). 인간 역할은 로켓펀치 공급량으로 검증하며,
          AI/미션은 MISO로 실제 실행됩니다. 외부 API 미응답 시 목 데이터로 graceful fallback.
        </p>
        <p className="mt-2 font-medium text-slate-500">Workforce Architect · 빌더 : 복병준, 2026.5.31</p>
      </footer>

      {/* #3 아래로 스크롤 인디케이터 */}
      <button
        onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.82), behavior: "smooth" })}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 animate-bounce items-center justify-center rounded-full bg-violet-600 text-white shadow-lg ring-4 ring-violet-200 hover:bg-violet-500"
        title="다음 단계로 내려가기"
        aria-label="아래로 스크롤"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </main>
  );
}

function FlowArrow() {
  return (
    <div className="my-4 flex justify-center text-slate-300" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
