// lib/miso.ts — 서버 전용 MISO 클라이언트 (키는 서버에서만 주입, §1 보안)
import "server-only";

const BASE = process.env.MISO_BASE_URL;

export interface MisoChatArgs {
  key: string;
  inputs: Record<string, string | number | boolean>;
  query: string;
  conversationId?: string | null;
  user?: string;
}

export interface MisoChatResponse {
  answer: string;
  conversation_id?: string;
  metadata?: { usage?: Record<string, unknown> };
}

// MISO /chat (blocking). 스펙 §1/§6: mode:"blocking" 으로 받고 answer 를 JSON 파싱.
export async function misoChat(args: MisoChatArgs): Promise<MisoChatResponse> {
  if (!BASE) throw new Error("MISO_BASE_URL not set");
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.key}`,
    },
    body: JSON.stringify({
      inputs: args.inputs,
      query: args.query,
      // MISO/Dify 계열 호환을 위해 둘 다 전송
      mode: "blocking",
      response_mode: "blocking",
      conversation_id: args.conversationId ?? undefined,
      user: args.user ?? "workforce-architect",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MISO ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as MisoChatResponse;
}

// MISO 워크플로우 (/workflows/run) — P9 에서 사용. 여기 미리 정의.
export async function misoWorkflowRun(
  key: string,
  inputs: Record<string, unknown>,
  user = "workforce-architect",
) {
  if (!BASE) throw new Error("MISO_BASE_URL not set");
  const res = await fetch(`${BASE}/workflows/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ inputs, mode: "blocking", response_mode: "blocking", user }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MISO ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

// 모델이 코드펜스/설명을 섞어도 JSON 본문만 안전하게 추출 (§9 graceful)
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("JSON object not found in MISO answer");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
