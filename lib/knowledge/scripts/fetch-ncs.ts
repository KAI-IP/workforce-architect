/**
 * fetch-ncs.ts — NCS 시드를 data.go.kr 권위 데이터로 갱신(선택)
 *
 * P0 시드는 NCS 프레임워크 기준의 큐레이션 값이다. 이 스크립트는
 * 공공데이터포털(한국산업인력공단) Open API 로 능력단위·수행준거를 받아
 * lib/knowledge/ncs/*.json 의 competencyUnits 를 "권위 텍스트"로 교체한다.
 *
 * 사용:
 *   1) data.go.kr 에서 아래 API 활용신청 → 서비스키 발급
 *      - 15128213 NCS 기준정보 조회(대~능력단위요소, 7 operations)
 *      - 15063879 NCS 관련 정보 서비스(능력단위 상세)
 *   2) .env.local 에 DATA_GO_KR_SERVICE_KEY=... (커밋 금지)
 *   3) npx tsx lib/knowledge/scripts/fetch-ncs.ts --slug veterinary --apply
 *      (--apply 없으면 dry-run 으로 비교만 출력)
 *
 * 주의: 엔드포인트/파라미터 명세는 조사 시점 기준이며 API 버전에 따라
 * 키 이름이 다를 수 있다. 응답을 방어적으로 파싱하고, 실패 시 시드를 보존한다.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const NCS_DIR = join(HERE, "..", "ncs");

const BASE_UNIT = "https://apis.data.go.kr/B490001/ncsApi"; // 15128213 계열 (예시 베이스)
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY;

interface SeedFile {
  job: {
    classification: { detail: { code: string; name: string } };
    competencyUnits: unknown[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

interface FetchedUnit {
  code: string;
  name: string;
  level: number;
  elements: { name: string; performanceCriteria: string[] }[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const APPLY = process.argv.includes("--apply");

/** 능력단위 + 능력단위요소 + 수행준거를 세분류(직무) 코드로 조회 */
async function fetchUnitsByDetailCode(detailCode: string): Promise<FetchedUnit[]> {
  if (!SERVICE_KEY) throw new Error("DATA_GO_KR_SERVICE_KEY not set (.env.local)");
  const url =
    `${BASE_UNIT}/getNcsCompetencyUnit` +
    `?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
    `&type=json&numOfRows=200&pageNo=1` +
    `&ncsSubdCd=${encodeURIComponent(detailCode)}`;
  const res = await fetch(url, { cache: "no-store" as RequestCache });
  if (!res.ok) throw new Error(`data.go.kr ${res.status}: ${await res.text().catch(() => "")}`);
  const json: unknown = await res.json();
  return normalize(json);
}

/** 응답 스키마 방어적 정규화 (item 배열 위치/키명이 버전마다 달라 폭넓게 탐색) */
function normalize(json: unknown): FetchedUnit[] {
  const items = deepFindArray(json, ["item", "items", "row"]);
  const byUnit = new Map<string, FetchedUnit>();
  for (const it of items) {
    const o = it as Record<string, unknown>;
    const code = str(o, ["compUnitCd", "competencyUnitCode", "능력단위코드", "unitCode"]);
    const name = str(o, ["compUnitNm", "competencyUnitName", "능력단위명", "unitName"]);
    if (!code || !name) continue;
    const level = num(o, ["levelNm", "level", "수준", "ncsLevel"]) ?? 0;
    const elemName = str(o, ["compUnitElmtNm", "elementName", "능력단위요소명"]) ?? name;
    const crit = str(o, ["perfCriteria", "수행준거", "performanceCriteria"]);
    const u = byUnit.get(code) ?? { code, name, level, elements: [] };
    let el = u.elements.find((e) => e.name === elemName);
    if (!el) { el = { name: elemName, performanceCriteria: [] }; u.elements.push(el); }
    if (crit) crit.split(/\n|;|\.(?=\s|$)/).map((s) => s.trim()).filter(Boolean)
      .forEach((c) => el!.performanceCriteria.push(c));
    byUnit.set(code, u);
  }
  return Array.from(byUnit.values());
}

function deepFindArray(o: unknown, keys: string[]): unknown[] {
  if (Array.isArray(o)) return o;
  if (o && typeof o === "object") {
    for (const k of keys) {
      const v = (o as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v;
    }
    for (const v of Object.values(o as Record<string, unknown>)) {
      const found = deepFindArray(v, keys);
      if (found.length) return found;
    }
  }
  return [];
}
function str(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  return undefined;
}
function num(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
    if (typeof v === "string") { const m = v.match(/\d+/); if (m) return Number(m[0]); }
  }
  return undefined;
}

async function main() {
  const slug = arg("slug");
  if (!slug) { console.error("usage: --slug <slug> [--apply]"); process.exit(1); }
  const path = join(NCS_DIR, `${slug}.json`);
  const seed = JSON.parse(await readFile(path, "utf8")) as SeedFile;
  const detailCode = seed.job.classification.detail.code;

  console.log(`[fetch-ncs] ${slug} (세분류 ${detailCode}) ...`);
  const fetched = await fetchUnitsByDetailCode(detailCode);
  console.log(`  시드 능력단위 ${seed.job.competencyUnits.length}개 → API ${fetched.length}개 수신`);

  if (!fetched.length) { console.warn("  수신 0건: 시드 보존(교체 안 함)"); return; }
  if (!APPLY) { console.log("  dry-run: --apply 로 실제 교체"); console.dir(fetched, { depth: 4 }); return; }

  (seed.job as Record<string, unknown>).competencyUnits = fetched;
  (seed as Record<string, unknown>).provenance = {
    ...((seed as Record<string, unknown>).provenance as object),
    source: "data.go.kr-authoritative",
    fetchedDetailCode: detailCode,
  };
  await writeFile(path, JSON.stringify(seed, null, 2) + "\n", "utf8");
  console.log(`  ✓ ${slug}.json 갱신 완료 (provenance=data.go.kr-authoritative)`);
}

main().catch((e) => { console.error("[fetch-ncs] 실패:", e.message); process.exit(1); });
