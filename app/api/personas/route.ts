import { NextResponse } from "next/server";
import type { Persona, Role } from "@/lib/types";
import mockPersonas from "@/lib/mocks/personas.json";
import { misoChat, extractJson } from "@/lib/miso";
import { searchJobs, parseJobs, type JobSample } from "@/lib/rocketpunch";
import { buildRoleGrounding } from "@/lib/knowledge";

export const runtime = "nodejs";

const PERSONA_SCHEMA =
  '{"personas":[{"label":string,"seniority":"BEGINNER|JUNIOR|MIDLEVEL|SENIOR|EXECUTIVE","years":number,"domain":string,"workPref":string,"reason":string}]}';

// 로켓펀치 시장 근거(공급량+샘플). 실패 시 목.
async function getMarket(role: Role): Promise<{ supply: number; samples: JobSample[]; degraded: boolean }> {
  const key = process.env.ROCKETPUNCH_API_KEY;
  const mock = mockPersonas.market as { supply: number; samples: JobSample[] };
  if (process.env.MOCK_MODE === "true" || !key || !role.jobCategoryQuery) {
    return { supply: mock.supply, samples: mock.samples, degraded: true };
  }
  try {
    const { supply, samples } = parseJobs(await searchJobs(role.jobCategoryQuery, key));
    return { supply, samples, degraded: false };
  } catch {
    return { supply: mock.supply, samples: mock.samples, degraded: true };
  }
}

export async function POST(req: Request) {
  let role: Role;
  try {
    role = ((await req.json()) as { role: Role }).role;
    if (!role) throw new Error("no role");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const market = await getMarket(role);

  // 페르소나 합성 — §2: 아키텍트 MISO 앱 재사용(query만 다르게)
  const key = process.env.MISO_ARCHITECT_KEY;
  if (process.env.MOCK_MODE === "true" || !key) {
    return NextResponse.json({
      personas: mockPersonas.personas as Persona[],
      market: { supply: market.supply, samples: market.samples },
      degraded: true,
    });
  }

  const sampleHint = market.samples
    .map((s) => `- ${s.title} / ${s.company} / ${s.qualification}`)
    .join("\n");
  // P0 그라운딩: 역할에 매칭된 NCS 수행준거·노동비용을 페르소나 합성 근거로 주입.
  const grounding = buildRoleGrounding(role);
  const query =
    `다음 인간 역할에 대한 합성 채용 페르소나 3명을 JSON으로만 출력하라(조직설계 금지). ` +
    `스키마: ${PERSONA_SCHEMA}. ` +
    `역할: ${role.title} (${role.lane}), 직군: ${role.jobCategoryQuery}, 현재 시니어리티: ${role.seniority}. ` +
    (grounding ? `\n${grounding}\n` : "") +
    `참고 시장 공고:\n${sampleHint || "(없음)"}\n` +
    `reason 에는 왜 이 사람이 엣지/체화 판단에 적합한지(NCS 수행준거 근거) 한 문장.`;

  try {
    const data = await misoChat({
      key,
      inputs: {
        summary: role.title || "역할",
        targetCustomer: role.jobCategoryQuery || role.title || "일반",
        targetRevenue: "0",
        durationMonths: "0",
        laborBudget: "0",
        hasOffline: "false",
      },
      query,
    });
    const parsed = extractJson<{ personas?: Persona[] }>(data.answer);
    const personas = parsed.personas ?? [];
    if (!personas.length) throw new Error("no personas parsed");
    return NextResponse.json({
      personas,
      market: { supply: market.supply, samples: market.samples },
      degraded: market.degraded,
    });
  } catch (err) {
    return NextResponse.json({
      personas: mockPersonas.personas as Persona[],
      market: { supply: market.supply, samples: market.samples },
      degraded: true,
      error: String(err),
    });
  }
}
