/**
 * build-rag-corpus.ts — P0 지식 JSON → MISO/Dify "지식(RAG)" 업로드용 Markdown 평탄화
 *
 * lib/knowledge/ 아래의 NCS 직무·노동비용·프로세스 맵 JSON 을 읽어
 * lib/knowledge/miso-rag/ 에 사람이 읽기 쉬운 Markdown 으로 펼친다.
 * 직무 목록은 ncs/index.json 을, 프로세스 맵은 디렉터리를 동적으로 읽어
 * 새 직무/맵이 추가돼도 코드 수정 없이 반영된다.
 *
 * 사용:
 *   npx tsx lib/knowledge/scripts/build-rag-corpus.ts
 *
 * 출력:
 *   miso-rag/ncs-<slug>.md      직무별 NCS 능력단위·수행준거
 *   miso-rag/labor-cost.md      직군·경력별 노동비용 + AI 운영비 참고
 *   miso-rag/process-<slug>.md  프로세스 맵별 레인·핸드오프
 *   miso-rag/corpus.md          전체 단일 파일(원샷 업로드용)
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(HERE, "..");
const NCS_DIR = join(KNOWLEDGE_DIR, "ncs");
const LABOR_DIR = join(KNOWLEDGE_DIR, "labor-cost");
const PROCESS_DIR = join(KNOWLEDGE_DIR, "process-maps");
const OUT_DIR = join(KNOWLEDGE_DIR, "miso-rag");

const AUTOGEN_NOTE =
  "<!-- 자동 생성 파일: build-rag-corpus.ts 가 생성합니다. 직접 수정하지 마세요. -->";

const SECTION_SEP = "\n\n---\n\n";

const SENIORITY_ORDER = [
  "BEGINNER",
  "JUNIOR",
  "MIDLEVEL",
  "SENIOR",
  "EXECUTIVE",
] as const;

// ─── 입력 스키마 타입 ───────────────────────────────────────────────────────
interface NcsIndex {
  jobs: { slug: string; title: string; major: string; laneHint?: string; keywords?: string[] }[];
}

interface CodeName {
  code: string;
  name: string;
}

interface CompetencyElement {
  name: string;
  performanceCriteria: string[];
}

interface CompetencyUnit {
  code: string;
  name: string;
  level: number;
  elements: CompetencyElement[];
}

interface NcsJobFile {
  provenance?: { source?: string; authority?: string; refreshApi?: string; note?: string };
  job: {
    title: string;
    aliases?: string[];
    classification: {
      major: CodeName;
      middle: CodeName;
      minor: CodeName;
      detail: CodeName;
    };
    laneHint?: string;
    embodimentBasis?: string;
    competencyUnits: CompetencyUnit[];
  };
}

type SalaryRange = [number, number];

interface LaborFamily {
  ncsMajor: string;
  jobSlug: string;
  family: string;
  salaryBySeniority: Record<string, SalaryRange | undefined>;
  fieldRate?: Record<string, unknown>;
}

interface LaborCostFile {
  meta: {
    title: string;
    currency: string;
    basisYear: number;
    sources: string[];
    poc_assumption?: boolean;
    disclaimer: string;
    seniorityScale: Record<string, string>;
  };
  families: LaborFamily[];
  aiOpsCostReference: {
    currency: string;
    note?: string;
    tiers: Record<string, SalaryRange | undefined>;
  };
}

interface ProcessStep {
  actor: string;
  lane: string;
  ncsJob?: string;
  action: string;
  handoffTo?: string | null;
  isGate?: boolean;
}

interface ProcessStage {
  order: number;
  name: string;
  steps: ProcessStep[];
}

interface ProcessMapFile {
  domain: string;
  poc_assumption?: boolean;
  note?: string;
  laneSummary: Record<string, number>;
  stages: ProcessStage[];
  handoffRisks: string[];
}

// ─── 유틸 ───────────────────────────────────────────────────────────────────
async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function range(r: SalaryRange | undefined): string {
  if (!r || r.length < 2) return "—";
  return `${r[0]}~${r[1]}`;
}

const AI_TIER_LABELS: Record<string, string> = {
  single_workflow_light: "단일 경량 워크플로우",
  agent_with_rag: "RAG 결합 에이전트",
  multi_agent_or_pipeline: "멀티 에이전트/파이프라인",
  high_volume_realtime: "대용량·실시간",
};

// ─── NCS 직무 Markdown ──────────────────────────────────────────────────────
function buildNcsMarkdown(slug: string, data: NcsJobFile): string {
  const { job } = data;
  const c = job.classification;
  const lines: string[] = [];

  lines.push(AUTOGEN_NOTE);
  lines.push("");
  lines.push(`# ${job.title} (NCS 직무: ${slug})`);
  lines.push("");
  lines.push(
    `**분류 경로:** ${c.major.name} > ${c.middle.name} > ${c.minor.name} > ${c.detail.name}`,
  );
  lines.push("");
  lines.push(
    `**분류 코드:** 대분류 ${c.major.code} · 중분류 ${c.middle.code} · 소분류 ${c.minor.code} · 세분류 ${c.detail.code}`,
  );
  if (job.aliases && job.aliases.length) {
    lines.push("");
    lines.push(`**유사 명칭:** ${job.aliases.join(", ")}`);
  }
  if (job.laneHint) {
    lines.push("");
    lines.push(`**레인 힌트(laneHint):** ${job.laneHint}`);
  }
  if (job.embodimentBasis) {
    lines.push("");
    lines.push(`**체화 근거(embodimentBasis):** ${job.embodimentBasis}`);
  }

  for (const unit of job.competencyUnits) {
    lines.push("");
    lines.push(`## 능력단위: ${unit.name} (코드 ${unit.code}, 수준 ${unit.level})`);
    for (const el of unit.elements) {
      lines.push("");
      lines.push(`- **${el.name}**`);
      for (const pc of el.performanceCriteria) {
        lines.push(`  - ${pc}`);
      }
    }
  }

  const src = data.provenance?.source ?? "ncs-framework-curated";
  const refresh = data.provenance?.refreshApi ?? "n/a";
  lines.push("");
  lines.push(`> 출처: ${src} · 갱신 API: ${refresh}`);
  lines.push("");

  return lines.join("\n");
}

// ─── 노동비용 Markdown ──────────────────────────────────────────────────────
function buildLaborMarkdown(data: LaborCostFile): string {
  const { meta, families, aiOpsCostReference } = data;
  const lines: string[] = [];

  lines.push(AUTOGEN_NOTE);
  lines.push("");
  lines.push(`# ${meta.title}`);
  lines.push("");
  lines.push("> **PoC 가정**: 아래 수치는 공개 통계 기반 PoC 가정값이며 재무자문이 아닙니다.");
  lines.push("");
  lines.push(`**통화/단위:** ${meta.currency}`);
  lines.push("");
  lines.push(`**기준연도:** ${meta.basisYear}`);
  lines.push("");

  // 경력 스케일 설명
  lines.push("**경력 구간(seniorityScale):**");
  lines.push("");
  for (const key of SENIORITY_ORDER) {
    const desc = meta.seniorityScale[key];
    if (desc) lines.push(`- ${key}: ${desc}`);
  }
  lines.push("");

  // 메인 테이블
  lines.push("## 직군·경력별 노동비용 (만원/년)");
  lines.push("");
  lines.push("| 직군(family) | NCS대분류 | BEGINNER | JUNIOR | MIDLEVEL | SENIOR | EXECUTIVE |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const f of families) {
    const s = f.salaryBySeniority;
    lines.push(
      `| ${f.family} | ${f.ncsMajor} | ${range(s.BEGINNER)} | ${range(s.JUNIOR)} | ${range(s.MIDLEVEL)} | ${range(s.SENIOR)} | ${range(s.EXECUTIVE)} |`,
    );
  }
  lines.push("");

  // 현장 도급 단가(있는 직군만)
  const withField = families.filter((f) => f.fieldRate);
  if (withField.length) {
    lines.push("### 현장 도급 단가 참고 (fieldRate, PoC 가정)");
    lines.push("");
    for (const f of withField) {
      lines.push(`- **${f.family}**: ${JSON.stringify(f.fieldRate)}`);
    }
    lines.push("");
  }

  // AI 운영비 참고 테이블
  lines.push(`## AI 운영비 참고 (${aiOpsCostReference.currency})`);
  lines.push("");
  if (aiOpsCostReference.note) {
    lines.push(`> ${aiOpsCostReference.note}`);
    lines.push("");
  }
  lines.push("| 티어 | 범위 |");
  lines.push("| --- | --- |");
  for (const [key, val] of Object.entries(aiOpsCostReference.tiers)) {
    const label = AI_TIER_LABELS[key] ?? key;
    lines.push(`| ${label} (${key}) | ${range(val)} |`);
  }
  lines.push("");

  // 출처
  lines.push("## 출처");
  lines.push("");
  for (const s of meta.sources) {
    lines.push(`- ${s}`);
  }
  lines.push("");

  // 면책
  lines.push("## 면책 (disclaimer)");
  lines.push("");
  lines.push(meta.disclaimer);
  lines.push("");

  return lines.join("\n");
}

// ─── 프로세스 맵 Markdown ───────────────────────────────────────────────────
function buildProcessMarkdown(slug: string, data: ProcessMapFile): string {
  const lines: string[] = [];

  lines.push(AUTOGEN_NOTE);
  lines.push("");
  lines.push(`# 프로세스 맵: ${data.domain} (${slug})`);
  lines.push("");
  lines.push("> **PoC 가정**: 아래 흐름은 PoC 검증용 프로세스 맵입니다.");
  lines.push("");
  if (data.note) {
    lines.push(data.note);
    lines.push("");
  }

  const laneEntries = Object.entries(data.laneSummary)
    .map(([lane, n]) => `${lane}=${n}`)
    .join(" · ");
  lines.push(`**레인 요약(laneSummary):** ${laneEntries}`);
  lines.push("");

  for (const stage of data.stages) {
    lines.push(`## 단계 ${stage.order}. ${stage.name}`);
    lines.push("");
    const flow = stage.steps
      .map((s) => `${s.actor}(${s.lane})`)
      .join(" → ");
    lines.push(`**흐름:** ${flow}`);
    lines.push("");
    for (const s of stage.steps) {
      const gate = s.isGate ? " [게이트]" : "";
      const handoff = s.handoffTo ? ` → 핸드오프: ${s.handoffTo}` : " → (종료)";
      const ncs = s.ncsJob ? ` · NCS: ${s.ncsJob}` : "";
      lines.push(`- **${s.actor}** (${s.lane}${ncs})${gate}: ${s.action}${handoff}`);
    }
    lines.push("");
  }

  lines.push("## 핸드오프 리스크 (handoffRisks)");
  lines.push("");
  for (const r of data.handoffRisks) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  return lines.join("\n");
}

// ─── 메인 ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const sections: string[] = [];
  let ncsCount = 0;
  let processCount = 0;
  const written: string[] = [];

  async function emit(fileName: string, body: string): Promise<void> {
    const trimmed = body.trimEnd() + "\n";
    await writeFile(join(OUT_DIR, fileName), trimmed, "utf8");
    written.push(fileName);
  }

  // 1) NCS 직무 — index.json 에서 동적 발견
  const index = await readJson<NcsIndex>(join(NCS_DIR, "index.json"));
  for (const job of index.jobs) {
    const data = await readJson<NcsJobFile>(join(NCS_DIR, `${job.slug}.json`));
    const md = buildNcsMarkdown(job.slug, data);
    await emit(`ncs-${job.slug}.md`, md);
    sections.push(md.replace(AUTOGEN_NOTE, "").trimStart());
    ncsCount++;
  }

  // 2) 노동비용
  const labor = await readJson<LaborCostFile>(
    join(LABOR_DIR, "labor-cost-table.json"),
  );
  const laborMd = buildLaborMarkdown(labor);
  await emit("labor-cost.md", laborMd);
  sections.push(laborMd.replace(AUTOGEN_NOTE, "").trimStart());

  // 3) 프로세스 맵 — 디렉터리에서 동적 발견
  const processFiles = (await readdir(PROCESS_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of processFiles) {
    const slug = file.replace(/\.json$/, "");
    const data = await readJson<ProcessMapFile>(join(PROCESS_DIR, file));
    const md = buildProcessMarkdown(slug, data);
    await emit(`process-${slug}.md`, md);
    sections.push(md.replace(AUTOGEN_NOTE, "").trimStart());
    processCount++;
  }

  // 4) 단일 corpus.md (원샷 업로드용)
  const header = [
    AUTOGEN_NOTE,
    "",
    "# workforce-architect P0 그라운딩 코퍼스 (MISO 지식/RAG 업로드용)",
    "",
    "이 단일 파일은 workforce-architect 의 P0 지식(NCS 직무 능력단위, 직군·경력별 노동비용, " +
      "도메인 프로세스 맵)을 평탄화한 그라운딩 코퍼스입니다. MISO/Dify 의 지식(RAG) 에 " +
      "한 번에 업로드하기 위한 용도이며, build-rag-corpus.ts 가 자동 생성합니다. 직접 수정하지 마세요.",
    "",
    `포함: NCS 직무 ${ncsCount}건 · 노동비용 표 1건 · 프로세스 맵 ${processCount}건`,
  ].join("\n");

  const corpus = [header, ...sections].join(SECTION_SEP);
  await emit("corpus.md", corpus);

  console.log(
    `[build-rag-corpus] 완료: NCS ${ncsCount} · 노동비용 1 · 프로세스맵 ${processCount} → ${OUT_DIR}`,
  );
  for (const f of written) console.log(`  + miso-rag/${f}`);
}

main().catch((e) => {
  console.error("[build-rag-corpus] 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
