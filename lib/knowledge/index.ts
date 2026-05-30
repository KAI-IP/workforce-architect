// lib/knowledge/index.ts — P0 그라운딩 레이어 로더
// NCS 시드 + 직군 노동비용 + 프로세스 맵을 로드하고, 아키텍트/페르소나
// MISO 쿼리에 주입할 "근거 다이제스트"를 생성한다. (서버/클라 공용, 순수 함수)
import type { Lane, Seniority } from "@/lib/types";

import ncsIndex from "./ncs/index.json";
import veterinary from "./ncs/veterinary.json";
import counseling from "./ncs/counseling.json";
import legalAffairs from "./ncs/legal-affairs.json";
import projectManagement from "./ncs/project-management.json";
import foodQuality from "./ncs/food-quality.json";
import deliveryLogistics from "./ncs/delivery-logistics.json";
import sewerage from "./ncs/sewerage.json";
import demolition from "./ncs/demolition.json";
import equipmentInstallation from "./ncs/equipment-installation.json";
import digitalMarketing from "./ncs/digital-marketing.json";
import dataAnalysis from "./ncs/data-analysis.json";
import csOperations from "./ncs/cs-operations.json";
import accounting from "./ncs/accounting.json";
import hrLabor from "./ncs/hr-labor.json";
import softwareDevelopment from "./ncs/software-development.json";
import uxDesign from "./ncs/ux-design.json";
import sales from "./ncs/sales.json";
import electricalConstruction from "./ncs/electrical-construction.json";
import facilitySecurity from "./ncs/facility-security.json";
import cooking from "./ncs/cooking.json";

import laborCost from "./labor-cost/labor-cost-table.json";
import subscriptionCommerce from "./process-maps/subscription-commerce.json";
import urbanRedesign from "./process-maps/urban-redesign.json";

// ---- 타입 (시드 JSON 형태의 경량 표현) ----
export interface NcsPerformanceElement {
  name: string;
  performanceCriteria: string[];
}
export interface NcsCompetencyUnit {
  code: string;
  name: string;
  level: number;
  elements: NcsPerformanceElement[];
}
export interface NcsJob {
  slug: string;
  title: string;
  aliases: string[];
  classification: {
    major: { code: string; name: string };
    middle: { code: string; name: string };
    minor: { code: string; name: string };
    detail: { code: string; name: string };
  };
  laneHint: Lane;
  embodimentBasis: string;
  competencyUnits: NcsCompetencyUnit[];
}

interface RawNcsFile {
  job: Omit<NcsJob, "slug"> & { slug?: string };
}

interface CatalogEntry {
  slug: string;
  title: string;
  major: string;
  laneHint: Lane;
  keywords: string[];
}

// ---- 레지스트리 구성 (slug → NcsJob) ----
const RAW: Record<string, RawNcsFile> = {
  veterinary,
  counseling,
  "legal-affairs": legalAffairs,
  "project-management": projectManagement,
  "food-quality": foodQuality,
  "delivery-logistics": deliveryLogistics,
  sewerage,
  demolition,
  "equipment-installation": equipmentInstallation,
  "digital-marketing": digitalMarketing,
  "data-analysis": dataAnalysis,
  "cs-operations": csOperations,
  accounting,
  "hr-labor": hrLabor,
  "software-development": softwareDevelopment,
  "ux-design": uxDesign,
  sales,
  "electrical-construction": electricalConstruction,
  "facility-security": facilitySecurity,
  cooking,
} as unknown as Record<string, RawNcsFile>;

const CATALOG = ncsIndex.jobs as CatalogEntry[];

export const NCS_JOBS: NcsJob[] = CATALOG.map((c) => ({
  slug: c.slug,
  ...(RAW[c.slug].job as Omit<NcsJob, "slug">),
}));

const BY_SLUG = new Map(NCS_JOBS.map((j) => [j.slug, j]));

export function getNcsJob(slug: string): NcsJob | undefined {
  return BY_SLUG.get(slug);
}

// ---- 매칭: jobCategoryQuery / 역할명 → NCS 직무 ----
// 키워드·별칭·제목에 대한 토큰 부분일치 스코어링. 가장 높은 점수 1개 반환.
export function matchNcsJob(...queries: (string | undefined)[]): NcsJob | null {
  const hay = queries.filter(Boolean).join(" ").toLowerCase();
  if (!hay) return null;
  let best: { entry: CatalogEntry; score: number } | null = null;
  for (const entry of CATALOG) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (hay.includes(kw.toLowerCase())) score += kw.length >= 2 ? 2 : 1;
    }
    if (hay.includes(entry.title.toLowerCase())) score += 3;
    const job = BY_SLUG.get(entry.slug);
    if (job) for (const a of job.aliases) if (hay.includes(a.toLowerCase())) score += 2;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best ? BY_SLUG.get(best.entry.slug) ?? null : null;
}

// ---- 노동비용 조회 ----
interface LaborFamily {
  ncsMajor: string;
  jobSlug: string;
  family: string;
  salaryBySeniority: Record<Seniority, [number, number]>;
  fieldRate?: Record<string, unknown>;
}
const LABOR_BY_SLUG = new Map(
  (laborCost.families as LaborFamily[]).map((f) => [f.jobSlug, f]),
);

export function salaryRange(slug: string, seniority: Seniority): [number, number] | null {
  const fam = LABOR_BY_SLUG.get(slug);
  return fam?.salaryBySeniority?.[seniority] ?? null;
}

// 레인 정의(가설 §5.2) — 다이제스트에 명시해 분해 기준을 고정
const LANE_RUBRIC =
  "AI: 조합가능·자동화가능(데이터/생성/반복). " +
  "EDGE(인간): 윤리·신규·고위험·신뢰·가드레일(최종 책임·승인 게이트). " +
  "FIELD(인간): 물리적 신체 필요(방문·현장·시공).";

// ---- 프로세스 맵 선택 (브리프 키워드 기반) ----
const PROCESS_MAPS = [subscriptionCommerce, urbanRedesign] as const;

export function pickProcessMap(...text: (string | undefined)[]) {
  const hay = text.filter(Boolean).join(" ");
  const isUrban = /(도시|재개발|정비|인프라|철거|건설|하수|시공|현장)/.test(hay);
  const isCommerce = /(구독|커머스|쇼핑|배송|이커머스|리테일|D2C|정기배송)/.test(hay);
  if (isUrban && !isCommerce) return urbanRedesign;
  if (isCommerce && !isUrban) return subscriptionCommerce;
  return null; // 모호하면 강제하지 않음
}

function processMapDigest(map: (typeof PROCESS_MAPS)[number]): string {
  const flow = map.stages
    .map(
      (s) =>
        `${s.order}.${s.name}[` +
        s.steps.map((st) => `${st.actor}(${st.lane})`).join("→") +
        "]",
    )
    .join("  ");
  return `참고 프로세스 맵 — ${map.domain}\n흐름: ${flow}\n핸드오프 리스크: ${map.handoffRisks.join(" / ")}`;
}

// ============================================================
// 아키텍트용 그라운딩 다이제스트
// 분해 직전 query 에 주입하여 레인 판정·직무·비용을 현실값으로 고정.
// ============================================================
export function buildArchitectGrounding(brief: {
  summary?: string;
  title?: string;
  targetCustomer?: string;
}): string {
  const catalogLines = CATALOG.map(
    (c) =>
      `- ${c.title} (NCS 대분류 ${c.major}, 권장레인 ${c.laneHint}) → slug:${c.slug}`,
  ).join("\n");

  const costLines = (laborCost.families as LaborFamily[])
    .map((f) => {
      const mid = f.salaryBySeniority.MIDLEVEL;
      const sen = f.salaryBySeniority.SENIOR;
      return `- ${f.family}: 중급 ${mid[0]}~${mid[1]}, 시니어 ${sen[0]}~${sen[1]} (만원/년)`;
    })
    .join("\n");

  const map = pickProcessMap(brief.summary, brief.title, brief.targetCustomer);

  return [
    "## 그라운딩 지식 (NCS·노동통계 기반, PoC 시드)",
    "아래 실제 직무·수행준거·노동비용을 근거로 분해하라. 시드에 없는 직무는 추정 가능하되 NCS 대분류 체계를 따르라.",
    "",
    "### 레인 판정 기준",
    LANE_RUBRIC,
    "",
    "### 직무 카탈로그 (NCS 세분류 → 권장 레인)",
    catalogLines,
    "",
    "### 직군 노동비용 (estimatedAnnualSalary 근거, 만원/년)",
    costLines,
    `AI 운영비(estimatedMonthlyAiCost, 만원/월): 경량워크플로우 ${laborCost.aiOpsCostReference.tiers.single_workflow_light.join("~")}, RAG에이전트 ${laborCost.aiOpsCostReference.tiers.agent_with_rag.join("~")}, 멀티에이전트 ${laborCost.aiOpsCostReference.tiers.multi_agent_or_pipeline.join("~")}.`,
    ...(map ? ["", "### " + processMapDigest(map)] : []),
    "",
    "주의: 비용은 PoC 가정값(공개 통계 기반)이며 재무자문 아님.",
  ].join("\n");
}

// ============================================================
// 페르소나용 역할 그라운딩
// 특정 인간 역할에 매칭된 NCS 수행준거 + 노동비용을 근거로 제공.
// ============================================================
export function buildRoleGrounding(role: {
  title?: string;
  jobCategoryQuery?: string;
  seniority?: Seniority;
  lane?: Lane;
}): string | null {
  const job = matchNcsJob(role.jobCategoryQuery, role.title);
  if (!job) return null;

  const units = job.competencyUnits
    .map((u) => {
      const crits = u.elements
        .flatMap((e) => e.performanceCriteria)
        .slice(0, 3)
        .map((c) => `· ${c}`)
        .join("\n");
      return `[능력단위] ${u.name} (수준 ${u.level})\n${crits}`;
    })
    .join("\n");

  const sen = role.seniority ?? "MIDLEVEL";
  const range = salaryRange(job.slug, sen);
  const costLine = range
    ? `참고 보수(${sen}): 연 ${range[0]}~${range[1]}만원 (PoC 가정)`
    : "";

  return [
    `## NCS 그라운딩 — ${job.title}`,
    `분류: ${job.classification.major.name} > ${job.classification.minor.name} > ${job.classification.detail.name}`,
    `체화/엣지 근거: ${job.embodimentBasis}`,
    "",
    "### 실제 수행준거(발췌)",
    units,
    costLine ? "\n" + costLine : "",
  ].join("\n");
}

export const KNOWLEDGE_META = {
  ncsJobCount: NCS_JOBS.length,
  laborFamilies: (laborCost.families as LaborFamily[]).length,
  processMaps: PROCESS_MAPS.map((m) => m.domain),
};
