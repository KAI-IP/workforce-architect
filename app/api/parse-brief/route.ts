import { NextResponse } from "next/server";
import type { Brief } from "@/lib/types";
import mockDesign from "@/lib/mocks/design.json";
import { misoChat, extractJson } from "@/lib/miso";

export const runtime = "nodejs";

const SCHEMA =
  '{"title":string,"summary":string,"targetCustomer":string,"targetRevenue":number(만원/년 정수),"durationMonths":number(정수),"laborBudget":number(만원/년 정수),"hasOffline":boolean}';

function coerce(b: Partial<Brief>): Brief {
  return {
    title: String(b.title ?? "신규 사업"),
    summary: String(b.summary ?? ""),
    targetCustomer: String(b.targetCustomer ?? ""),
    targetRevenue: Number(b.targetRevenue) || 0,
    durationMonths: Number(b.durationMonths) || 12,
    laborBudget: Number(b.laborBudget) || 0,
    hasOffline: Boolean(b.hasOffline),
  };
}

export async function POST(req: Request) {
  let text: string;
  try {
    text = String(((await req.json()) as { text?: string }).text ?? "").trim();
    if (!text) throw new Error("empty");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const key = process.env.MISO_ARCHITECT_KEY;
  if (process.env.MOCK_MODE === "true" || !key) {
    return NextResponse.json({ brief: (mockDesign as { project: Brief }).project, degraded: true });
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await misoChat({
        key,
        inputs: {
          summary: text.slice(0, 2000),
          targetCustomer: "추출",
          targetRevenue: "0",
          durationMonths: "0",
          laborBudget: "0",
          hasOffline: "false",
        },
        query:
          `다음 자연어 사업 설명에서 Brief를 추출해 JSON으로만 출력하라(조직설계 금지). ` +
          `스키마: ${SCHEMA}. 명시 안 된 값은 업종 관행으로 합리적 추정. ` +
          `targetRevenue/laborBudget 은 만원 단위 정수(예: 3억=30000). 설명:\n${text}`,
      });
      const parsed = extractJson<Partial<Brief>>(data.answer);
      return NextResponse.json({ brief: coerce(parsed), degraded: false });
    } catch {
      /* retry */
    }
  }
  return NextResponse.json({ brief: (mockDesign as { project: Brief }).project, degraded: true });
}
