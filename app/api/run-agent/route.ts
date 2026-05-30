import { NextResponse } from "next/server";
import type { Brief, Role } from "@/lib/types";
import mockMission from "@/lib/mocks/run-agent.json";
import { misoChat, misoWorkflowRun, extractJson } from "@/lib/miso";

export const runtime = "nodejs";

const SCHEMA =
  '{"objective":string,"tasks":[string],"deliverables":[string],"kpi":[string],"sampleOutput":string}';

interface Body {
  role: Role;
  project?: Brief;
}

export async function POST(req: Request) {
  let role: Role;
  let project: Brief | undefined;
  try {
    const b = (await req.json()) as Body;
    role = b.role;
    project = b.project;
    if (!role) throw new Error("no role");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const isMock = process.env.MOCK_MODE === "true";

  // 1) MISO 워크플로우 키 있으면 /workflows/run (스펙 P9 — 실측 비용)
  const wfKey = process.env.MISO_WORKFLOW_KEY;
  if (!isMock && wfKey) {
    try {
      const data = (await misoWorkflowRun(wfKey, {
        role_title: role.title,
        lane: role.lane,
        business: project?.title ?? "",
        rationale: role.rationale,
      })) as { data?: { outputs?: unknown; total_tokens?: number; total_price?: string } };
      return NextResponse.json({
        output: data?.data?.outputs ?? data ?? {},
        usage: data?.data ?? null,
        source: "workflow",
        degraded: false,
      });
    } catch {
      /* fall through to architect */
    }
  }

  // 2) 아키텍트 chat 앱 재사용으로 미션 도출 (실 MISO) — 워크플로우 키 없을 때 메인 경로
  const key = process.env.MISO_ARCHITECT_KEY;
  if (!isMock && key) {
    const inputs = {
      // MISO 앱이 6개 입력변수를 모두 필수(non-empty)로 요구 → 빈 값 금지
      summary: project?.summary || role.title || "역할",
      targetCustomer: role.jobCategoryQuery || role.title || "일반",
      targetRevenue: "0",
      durationMonths: "0",
      laborBudget: "0",
      hasOffline: "false",
    };
    const query =
      `다음 역할의 실행 미션을 JSON으로만 출력하라(조직설계 금지). 스키마: ${SCHEMA}. ` +
      `역할: ${role.title} (${role.lane}). 레인근거: ${role.rationale}. ` +
      `사업: ${project?.title ?? ""} / ${project?.summary ?? ""}. ` +
      `tasks 4개(주차별 액션), deliverables 3개, kpi 3개, ` +
      `sampleOutput 은 이 역할이 지금 당장 만들 수 있는 산출물 1개를 2~3문장으로.`;

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await misoChat({ key, inputs, query });
        const parsed = extractJson(data.answer);
        return NextResponse.json({
          output: parsed,
          usage: data?.metadata?.usage ?? null,
          source: "architect",
          degraded: false,
        });
      } catch (err) {
        lastErr = err;
      }
    }
    return NextResponse.json({
      output: mockMission,
      usage: null,
      source: "mock",
      degraded: true,
      error: String(lastErr),
    });
  }

  return NextResponse.json({ output: mockMission, usage: null, source: "mock", degraded: true });
}
